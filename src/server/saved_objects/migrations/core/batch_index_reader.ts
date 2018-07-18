/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * This provides a batch reader interface for reading batches of docs out of an index.
*/

import { CallCluster } from './call_cluster';
import { rawToSavedObject, SavedObjectDoc } from './saved_object';

export interface BatchReader {
  read: () => Promise<SavedObjectDoc[]>;
  close: () => Promise<void>;
}

interface Opts {
  batchSize: number;
  callCluster: CallCluster;
  index: string;
  scrollDuration: string;
}

/**
 * Creates a reader that provides batches of documents from an index, converting them to
 * the saved object client format prior to returning them. If there is an open scroll, it
 * gets cleaned up when the reader is closed.
 */
export class BatchIndexReader implements BatchReader {
  private batchSize: number;
  private callCluster: CallCluster;
  private index: string;
  private scrollDuration: string;
  private scrollId: string | undefined;

  /**
   * Creates an instance of BatchIndexReader.
   *
   * @param {Opts} opts
   * @prop {number} batchSize - The number of docs to read per batch
   * @prop {CallCluster} callCluster - The elasticsearch connection
   * @prop {string} index - The index from which documents are read
   * @prop {string} scrollDuration - The scroll duration (e.g. '5m', see the elasticsearch scroll api docs)
   */
  constructor(opts: Opts) {
    this.batchSize = opts.batchSize;
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.scrollDuration = opts.scrollDuration;
  }

  /**
   * Reads a batch of documents from the index, returns an empty array if
   * there are no more documents to read.
   *
   * @returns {Promise<SavedObjectDoc[]}
   * @memberof BatchIndexReader
   */
  public async read() {
    const result = await this.nextBatch();
    const docs = result.hits.hits.map(rawToSavedObject);

    this.scrollId = result._scroll_id;

    return docs;
  }

  /**
   * Cleans up the reader. In this case, we run a clearScroll on the
   * elasticsearch scroll that we were using to read docs.
   *
   * @returns {Promise<void>}
   * @memberof BatchIndexReader
   */
  public async close() {
    const { callCluster, scrollId } = this;

    if (scrollId) {
      await callCluster('clearScroll', { scrollId });
    }
  }

  private nextBatch() {
    const { batchSize, callCluster, index, scrollDuration, scrollId } = this;

    if (scrollId !== undefined) {
      return callCluster('scroll', {
        scroll: scrollDuration,
        scrollId,
      });
    }

    return callCluster('search', {
      body: { size: batchSize },
      index,
      scroll: scrollDuration,
    });
  }
}
