/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { ESDocumentWithOperation, UniversalProfilingDocument } from '@kbn/synthtrace-client';
import { UNIVERSAL_PROFILING_EVENTS_INDEX } from '@kbn/synthtrace-client';
import { chunk, uniqBy } from 'lodash';
import type { Readable } from 'stream';
import { pipeline, Transform } from 'stream';
import { setTimeout as sleep } from 'timers/promises';
import type { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { SynthtraceEsClientBase } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import type { Logger } from '../utils/create_logger';
import type { UniversalProfilingMetadataDocument } from './stack_traces';

const SETUP_PATH = '/api/profiling/setup/es_resources';
const SETUP_MAX_ATTEMPTS = 3;
const SETUP_RETRY_DELAY_MS = 5_000;

const DOWNSAMPLING_BASE = 5;
const MAX_DOWNSAMPLING_EXPONENT = 11;

const METADATA_BULK_CHUNK_SIZE = 5_000;

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
  extends SynthtraceEsClient<UniversalProfilingDocument> {
  setupResources(): Promise<void>;
  loadMetadata(documents: UniversalProfilingMetadataDocument[]): Promise<void>;
}

export class UniversalProfilingSynthtraceEsClientImpl
  extends SynthtraceEsClientBase<UniversalProfilingDocument>
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

  /** Indexes stacktraces, stackframes and executables, skipping the documents that already exist. */
  async loadMetadata(documents: UniversalProfilingMetadataDocument[]): Promise<void> {
    // Stack traces share frames and executables.
    const uniqueDocuments = uniqBy(documents, ({ index, id }) => `${index}/${id}`);

    this.logger.info(`Loading ${uniqueDocuments.length} Universal Profiling metadata documents`);

    for (const documentsChunk of chunk(uniqueDocuments, METADATA_BULK_CHUNK_SIZE)) {
      const response = await this.client.bulk({
        operations: documentsChunk.flatMap(({ index, id, document }) => [
          { create: { _index: index, _id: id } },
          document,
        ]),
      });

      // Metadata is keyed by ID, so a conflict means the document was loaded by a previous run.
      const failedItems = response.items.filter(
        ({ create }) => create?.error && create.status !== 409
      );

      if (failedItems.length) {
        throw new Error(
          `Failed to load ${
            failedItems.length
          } Universal Profiling metadata documents: ${JSON.stringify(failedItems.slice(0, 5))}`
        );
      }
    }

    await this.refresh();
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

/**
 * Also writes each event to the downsampled `profiling-events-5powNN` indices, which the
 * `_profiling` APIs read for larger time ranges. An event lands in `5powNN` with probability
 * 5^-NN, and every event in `5powNN` is also in `5pow(NN-1)`, like in recorded data.
 */
function getDownsamplingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<UniversalProfilingDocument>, encoding, callback) {
      this.push(document);

      if (document._index === UNIVERSAL_PROFILING_EVENTS_INDEX) {
        const sample = Math.random();

        for (
          let exponent = 1;
          exponent <= MAX_DOWNSAMPLING_EXPONENT && sample < DOWNSAMPLING_BASE ** -exponent;
          exponent++
        ) {
          this.push({
            ...document,
            _index: `profiling-events-5pow${String(exponent).padStart(2, '0')}`,
          });
        }
      }

      callback();
    },
  });
}

function universalProfilingPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform<UniversalProfilingDocument>(),
      getDownsamplingTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}
