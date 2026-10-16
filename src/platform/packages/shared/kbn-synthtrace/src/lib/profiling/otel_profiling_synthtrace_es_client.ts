/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { OtelProfilingDocument, OtelProfilingEventDocument } from '@kbn/synthtrace-client';
import { OTEL_PROFILING_EVENTS_INDEX } from '@kbn/synthtrace-client';
import type { Readable } from 'stream';
import { pipeline } from 'stream';
import type { SynthtraceEsClientOptions } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import type { Logger } from '../utils/create_logger';
import { getDownsampledIndexName, getDownsamplingTransform } from './downsampling';
import type { ProfilingSynthtraceEsClient } from './profiling_synthtrace_es_client_base';
import { ProfilingSynthtraceEsClientBase } from './profiling_synthtrace_es_client_base';

const OTEL_DATA_STREAM_SUFFIX = '.otel-default';

export type OtelProfilingSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export type OtelProfilingSynthtraceEsClient = ProfilingSynthtraceEsClient<OtelProfilingDocument>;

/**
 * Writes profiling data in the OTel schema. Elasticsearch installs the templates of these data
 * streams, so they need no setup and are recreated on the next write after being deleted.
 */
export class OtelProfilingSynthtraceEsClientImpl
  extends ProfilingSynthtraceEsClientBase<OtelProfilingDocument>
  implements OtelProfilingSynthtraceEsClient
{
  constructor(
    options: { client: Client; logger: Logger } & OtelProfilingSynthtraceEsClientOptions
  ) {
    super({
      ...options,
      pipeline: otelProfilingPipeline(),
    });
    this.dataStreams = [`profiling-*${OTEL_DATA_STREAM_SUFFIX}`];
  }
}

function otelProfilingPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform<OtelProfilingDocument>(),
      getDownsamplingTransform<OtelProfilingEventDocument>({
        eventsIndex: OTEL_PROFILING_EVENTS_INDEX,
        getDownsampledIndex: (exponent) =>
          getDownsampledIndexName(exponent, OTEL_DATA_STREAM_SUFFIX),
        getCount: (event) => event.count ?? 1,
        withCount: (event, count) => ({ ...event, count }),
      }),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}
