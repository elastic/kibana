/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { ApmOtelFields } from '@kbn/apm-synthtrace-client';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../../../shared/base_client';
import { Logger } from '../../../utils/create_logger';
import { otelPipeline } from './apm_otel_pipeline';

export type OtelSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class OtelSynthtraceEsClient extends SynthtraceEsClient<ApmOtelFields> {
  constructor(options: { client: Client; logger: Logger } & OtelSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: otelPipeline(),
    });
    this.dataStreams = ['metrics-*.otel*', 'traces-*.otel*', 'logs-*.otel*'];
  }

  getDefaultPipeline(
    {
      includeSerialization,
    }: {
      includeSerialization?: boolean;
    } = { includeSerialization: true }
  ) {
    return otelPipeline(includeSerialization);
  }
}
