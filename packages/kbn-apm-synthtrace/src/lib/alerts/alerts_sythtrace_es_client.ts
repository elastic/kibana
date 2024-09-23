/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { ESDocumentWithOperation, AlertEntityDocument } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';

export type AlertsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class AlertsSynthtraceEsClient extends SynthtraceEsClient<AlertEntityDocument> {
  constructor(options: { client: Client; logger: Logger } & AlertsSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: alertsPipeline(),
    });
    this.dataStreams = ['alerts-observability.apm*', 'alerts-observability.metrics*'];
  }
}

function alertsPipeline() {
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
    transform(document: ESDocumentWithOperation<AlertEntityDocument>, encoding, callback) {
      const alertProducer = document['kibana.alert.rule.producer'];
      if (alertProducer === 'apm') {
        document._index = 'alerts-observability.apm.alerts-default';
      } else if (alertProducer === 'infrastructure') {
        document._index = 'alerts-observability.metrics.alerts-default';
      } else {
        throw new Error('Cannot determine index for event');
      }

      callback(null, document);
    },
  });
}
