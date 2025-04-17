/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { SyntheticsMonitorDocument } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';
import { getRoutingTransform } from '../shared/data_stream_get_routing_transform';

export type SyntheticsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class SyntheticsSynthtraceEsClient extends SynthtraceEsClient<SyntheticsMonitorDocument> {
  constructor(options: { client: Client; logger: Logger } & SyntheticsSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: syntheticsPipeline(),
    });
    this.dataStreams = ['synthetics-*-*'];
  }
}

function syntheticsPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform<SyntheticsMonitorDocument>(),
      getRoutingTransform('synthetics'),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}
