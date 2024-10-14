/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { PassThrough, Readable, Transform, pipeline } from 'stream';
import { ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import fetch from 'node-fetch';
import { SynthtraceEsClient } from '../shared/base_client';
import { Logger } from '../utils/create_logger';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { createEntityLatestAggregator } from './aggregators/create_entity_aggregator';
import { fork } from '../utils/stream_utils';
import { kibanaHeaders } from '../shared/client_headers';
import { getFetchAgent } from '../../cli/utils/ssl';

interface EntityDefinitionResponse {
  definitions: Array<{ type: string; state: { installed: boolean; running: boolean } }>;
}

export class EntitySynthtraceEsClient extends SynthtraceEsClient<any> {
  private kibanaTarget: string;

  constructor({
    kibanaTarget,
    ...options
  }: { client: Client; logger: Logger; kibanaTarget: string } & any) {
    super({
      ...options,
      pipeline: entityPipeline(),
    });
    this.kibanaTarget = kibanaTarget;
    this.indices = [
      '.entities.v1.history.builtin_services*',
      '.entities.v1.latest.builtin_services*',
    ];
  }

  async installEntityIndexPatterns() {
    const url = `${this.kibanaTarget}/internal/entities/definition`;
    const response = await fetch(url, {
      method: 'GET',
      headers: kibanaHeaders(),
      agent: getFetchAgent(url),
    });
    const entityDefinition: EntityDefinitionResponse = await response.json();

    const hasServiceEntityDefinition = entityDefinition.definitions.find(
      (definition) => definition.type === 'service'
    )?.state.installed;

    if (hasServiceEntityDefinition === true) {
      this.logger.debug('Service Entity is already defined');
    } else {
      this.logger.debug('Installing Service Entity definition');
      const entityEnablementUrl = `${this.kibanaTarget}/internal/entities/managed/enablement?installOnly=true`;
      await fetch(entityEnablementUrl, {
        method: 'PUT',
        headers: kibanaHeaders(),
        agent: getFetchAgent(url),
      });
    }
  }
}

function entityPipeline() {
  return (base: Readable) => {
    const aggregators = [createEntityLatestAggregator('2m')];
    return pipeline(
      base,
      getSerializeTransform(),
      firstSeenTimestampTransform(),
      lastSeenTimestampTransform(),
      fork(new PassThrough({ objectMode: true }), ...aggregators),
      getRoutingTransform(),
      getDedotTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}

function firstSeenTimestampTransform() {
  let firstSeenTimestamp: number | undefined;
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<any>, encoding, callback) {
      const timestamp = document['@timestamp'] as number;
      if (firstSeenTimestamp === undefined) {
        firstSeenTimestamp = timestamp;
      }

      document['entity.firstSeenTimestamp'] = new Date(firstSeenTimestamp).toISOString();
      callback(null, document);
    },
  });
}

function lastSeenTimestampTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<any>, encoding, callback) {
      const timestamp = document['@timestamp'];
      const isoString = new Date(timestamp).toISOString();
      document['entity.lastSeenTimestamp'] = isoString;
      document['event.ingested'] = isoString;
      callback(null, document);
    },
  });
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<any>, encoding, callback) {
      const entityType: string | undefined = document['entity.type'];
      if (entityType === undefined) {
        throw new Error(`entity.type was not defined: ${JSON.stringify(document)}`);
      }
      const entityIndexName = entityType === 'service' ? 'services' : entityType;
      if (document['entity.definitionId'] === 'history') {
        document._index = `.entities.v1.history.builtin_${entityIndexName}_from_ecs_data.${moment().format(
          'YYYY-MM-DD'
        )}`;
      } else if (document['entity.definitionId'] === 'latest') {
        // There should be a single latest document per entity.id
        document._action = {
          index: {
            _index: `.entities.v1.latest.builtin_${entityIndexName}_from_ecs_data`,
            _id: document['entity.id'],
          },
        };
      }

      callback(null, document);
    },
  });
}
