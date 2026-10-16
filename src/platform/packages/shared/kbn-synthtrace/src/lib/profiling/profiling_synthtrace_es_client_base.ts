/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields } from '@kbn/synthtrace-client';
import { chunk, uniqBy } from 'lodash';
import type { SynthtraceEsClient } from '../shared/base_client';
import { SynthtraceEsClientBase } from '../shared/base_client';
import type { ProfilingMetadataDocument } from './stack_traces';

const METADATA_BULK_CHUNK_SIZE = 5_000;

export interface ProfilingSynthtraceEsClient<TFields extends Fields>
  extends SynthtraceEsClient<TFields> {
  loadMetadata(documents: ProfilingMetadataDocument[]): Promise<void>;
}

export abstract class ProfilingSynthtraceEsClientBase<TFields extends Fields>
  extends SynthtraceEsClientBase<TFields>
  implements ProfilingSynthtraceEsClient<TFields>
{
  /** Indexes stacktraces, stackframes and executables, skipping the documents that already exist. */
  async loadMetadata(documents: ProfilingMetadataDocument[]): Promise<void> {
    // Stack traces share frames and executables.
    const uniqueDocuments = uniqBy(documents, ({ index, id }) => `${index}/${id}`);

    this.logger.info(`Loading ${uniqueDocuments.length} profiling metadata documents`);

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
          `Failed to load ${failedItems.length} profiling metadata documents: ${JSON.stringify(
            failedItems.slice(0, 5)
          )}`
        );
      }
    }

    await this.refresh();
  }
}
