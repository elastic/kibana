/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  UniversalProfilingDocument,
  UniversalProfilingEventDocument,
} from '@kbn/synthtrace-client';
import { UNIVERSAL_PROFILING_EVENTS_INDEX } from '@kbn/synthtrace-client';
import type { Readable } from 'stream';
import { pipeline } from 'stream';
import { setTimeout as sleep } from 'timers/promises';
import type { SynthtraceEsClientOptions } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import type { Logger } from '../utils/create_logger';
import { getDownsampledIndexName, getDownsamplingTransform } from './downsampling';
import type { ProfilingSynthtraceEsClient } from './profiling_synthtrace_es_client_base';
import { ProfilingSynthtraceEsClientBase } from './profiling_synthtrace_es_client_base';

const SETUP_PATH = '/api/profiling/setup/es_resources';
const SETUP_MAX_ATTEMPTS = 3;
const SETUP_RETRY_DELAY_MS = 5_000;

// Excludes the OTel profiling data streams (`profiling-*.otel-*`), which this client doesn't write.
const UNIVERSAL_PROFILING_DATA_INDICES = [
  'profiling-events-*',
  'profiling-stacktraces',
  'profiling-stackframes',
  'profiling-executables',
  'profiling-hosts',
  '-*.otel-*',
];

export type UniversalProfilingSynthtraceEsClientOptions = Omit<
  SynthtraceEsClientOptions,
  'pipeline'
>;

export interface UniversalProfilingSynthtraceEsClient
  extends ProfilingSynthtraceEsClient<UniversalProfilingDocument> {
  setupResources(): Promise<void>;
}

export class UniversalProfilingSynthtraceEsClientImpl
  extends ProfilingSynthtraceEsClientBase<UniversalProfilingDocument>
  implements UniversalProfilingSynthtraceEsClient
{
  constructor(
    options: { client: Client; logger: Logger } & UniversalProfilingSynthtraceEsClientOptions
  ) {
    super({
      ...options,
      pipeline: universalProfilingPipeline(),
    });
    this.indices = UNIVERSAL_PROFILING_DATA_INDICES;
  }

  /** Sets up the Universal Profiling resources through Kibana, unless they are already set up. */
  async setupResources(): Promise<void> {
    const status = await this.kibana.fetch<{ has_setup: boolean }>(SETUP_PATH, { method: 'GET' });

    if (status.has_setup) {
      this.logger.info('Universal Profiling resources are already set up');
      return;
    }

    // The first setup call after Kibana starts can fail, so retry it like the Scout fixture does.
    for (let attempt = 1; attempt <= SETUP_MAX_ATTEMPTS; attempt++) {
      try {
        this.logger.info(
          `Setting up Universal Profiling resources (attempt ${attempt}/${SETUP_MAX_ATTEMPTS})`
        );
        await this.kibana.fetch(SETUP_PATH, { method: 'POST' });
        return;
      } catch (error) {
        if (attempt === SETUP_MAX_ATTEMPTS) {
          throw error;
        }
        this.logger.warning(`Universal Profiling setup failed, retrying: ${error.message}`);
        await sleep(SETUP_RETRY_DELAY_MS);
      }
    }
  }

  /**
   * Deletes the Universal Profiling documents but keeps the setup, so it doesn't need to be redone.
   * Deleting the indices instead would require disabling the ES resource management first,
   * because the ES profiling plugin recreates them otherwise.
   */
  async clean(): Promise<void> {
    this.logger.info(`Deleting Universal Profiling documents from "${this.indices.join(',')}"`);

    await this.client.deleteByQuery({
      index: this.indices,
      query: { match_all: {} },
      expand_wildcards: ['open', 'hidden'],
      ignore_unavailable: true,
      allow_no_indices: true,
      conflicts: 'proceed',
      refresh: true,
    });
  }
}

function universalProfilingPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform<UniversalProfilingDocument>(),
      getDownsamplingTransform<UniversalProfilingEventDocument>({
        eventsIndex: UNIVERSAL_PROFILING_EVENTS_INDEX,
        getDownsampledIndex: (exponent) => getDownsampledIndexName(exponent),
        getCount: (event) => event['Stacktrace.count'] ?? 1,
        withCount: (event, count) => ({ ...event, 'Stacktrace.count': count }),
      }),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}
