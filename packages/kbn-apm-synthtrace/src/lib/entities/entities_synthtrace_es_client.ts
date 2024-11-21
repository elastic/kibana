/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { EntityFields, ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';

export type EntitiesSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

interface Pipeline {
  includeSerialization?: boolean;
}

export class EntitiesSynthtraceEsClient extends SynthtraceEsClient<EntityFields> {
  constructor(options: { client: Client; logger: Logger } & EntitiesSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: entitiesPipeline(),
    });
    this.indices = ['.entities.v1.latest.builtin*'];
  }

  getDefaultPipeline({ includeSerialization }: Pipeline = { includeSerialization: true }) {
    return entitiesPipeline({ includeSerialization });
  }
}

function entitiesPipeline({ includeSerialization }: Pipeline = { includeSerialization: true }) {
  return (base: Readable) => {
    const serializationTransform = includeSerialization ? [getSerializeTransform()] : [];

    return pipeline(
      // @ts-expect-error Some weird stuff here with the type definition for pipeline. We have tests!
      base,
      ...serializationTransform,
      lastSeenTimestampTransform(),
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

function lastSeenTimestampTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<EntityFields>, encoding, callback) {
      const timestamp = document['@timestamp'];
      if (timestamp) {
        const isoString = new Date(timestamp).toISOString();
        document['entity.last_seen_timestamp'] = isoString;
        document['event.ingested'] = isoString;
        delete document['@timestamp'];
      }
      callback(null, document);
    },
  });
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<EntityFields>, encoding, callback) {
      const entityType: string | undefined = document['entity.type'];
      if (entityType === undefined) {
        throw new Error(`entity.type was not defined: ${JSON.stringify(document)}`);
      }
      const entityIndexName = `${entityType}s`;
      document._action = {
        index: {
          _index:
            `.entities.v1.latest.builtin_${entityIndexName}_from_ecs_data`.toLocaleLowerCase(),
          _id: document['entity.id'],
        },
      };

      callback(null, document);
    },
  });
}
