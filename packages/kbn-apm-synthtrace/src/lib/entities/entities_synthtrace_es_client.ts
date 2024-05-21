/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import {
  ApmFields,
  EntityDocument,
  ESDocumentWithOperation,
  LogDocument,
} from '@kbn/apm-synthtrace-client';
import { merge } from 'lodash';
import { PassThrough, pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';
import { fork } from '../utils/stream_utils';
import { createLogsServiceEntitiesAggregator } from './aggregators/create_logs_service_entities_aggregator';
import { createTracesServiceEntitiesAggregator } from './aggregators/create_traces_service_entities_aggregator';

export type EntitiesSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class EntitiesSynthtraceEsClient extends SynthtraceEsClient<EntityDocument> {
  constructor(options: { client: Client; logger: Logger } & EntitiesSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: entitiesPipeline(),
    });
    this.indices = ['entities'];
  }
}

function entitiesPipeline() {
  return (base: Readable) => {
    const aggregators = [
      createTracesServiceEntitiesAggregator(),
      // createLogsServiceAssetsAggregator(),
    ];

    return pipeline(
      base,
      getSerializeTransform(),
      fork(new PassThrough({ objectMode: true }), ...aggregators),
      getEntitiesFilterTransform(),
      getMergeEntitesTransform(),
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

function getEntitiesFilterTransform() {
  return new Transform({
    objectMode: true,
    transform(
      document: ESDocumentWithOperation<EntityDocument | ApmFields | LogDocument>,
      encoding,
      callback
    ) {
      if ('entity.id' in document) {
        callback(null, document);
      } else {
        callback();
      }
    },
  });
}

function getMergeEntitesTransform() {
  const mergedDocuments: Record<string, EntityDocument> = {};
  return new Transform({
    objectMode: true,
    transform(nextDocument: ESDocumentWithOperation<EntityDocument>, encoding, callback) {
      const entityId = nextDocument['entity.id'];
      if (!mergedDocuments[entityId]) {
        mergedDocuments[entityId] = { ...nextDocument };
      } else {
        const mergedDocument = mergedDocuments[entityId];
        // mergedDocument['asset.signalTypes'] = merge(
        //   mergedDocument['asset.signalTypes'],
        //   nextDocument['asset.signalTypes']
        // );
      }
      callback();
    },
    flush(callback) {
      Object.values(mergedDocuments).forEach((item) => this.push(item));
      callback();
    },
  });
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<EntityDocument>, encoding, callback) {
      if ('entity.id' in document) {
        document._index = `entities`;
      } else {
        throw new Error(`Cannot determine index for event ${JSON.stringify(document)}`);
      }

      callback(null, document);
    },
  });
}
