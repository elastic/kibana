/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { ESDocumentWithOperation, MonitoringDocument } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';

export type MonitoringSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class MonitoringSynthtraceEsClient extends SynthtraceEsClient<MonitoringDocument> {
  constructor(options: { client: Client; logger: Logger } & MonitoringSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: monitoringPipeline(),
    });
    this.dataStreams = ['.monitoring-*', 'metrics-*'];
  }
}

function monitoringPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform(),
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

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<MonitoringDocument>, encoding, callback) {
      if ('type' in document) {
        if (document.type === 'cluster_stats') {
          document._index = '.monitoring-es-7';
        } else if (document.type === 'kibana_stats') {
          document._index = '.monitoring-kibana-7';
        } else {
          throw new Error('Cannot determine index for event');
        }
      } else {
        throw new Error('Cannot determine index for event');
      }

      callback(null, document);
    },
  });
}
