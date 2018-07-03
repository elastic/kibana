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
 * This provides a batch reader interface for reading docs out of an array. This
 * allows us to read batches of docs from an in-memory source in the same way that
 * we would read them from an index or file or other async source.
*/

import { BatchReader, SavedObjectDoc } from './types';

/**
 * Returns a batch reader that serves up a single batch of documents.
 *
 * @param {SavedObjectDoc[]} docs - The documents being served.
 * @returns
 */
export class BatchArrayReader implements BatchReader {
  private docs: SavedObjectDoc[][];

  /**
   * Creates an instance of BatchArrayReader.
   * @param opts
   * @prop {SavedObjectDoc[]} docs - The batch of docs this reader provides.
   * @memberof BatchArrayReader
   */
  constructor({ docs }: { docs: SavedObjectDoc[] }) {
    this.docs = [docs];
  }

  /**
   * Reads the next batch of docs, returns an empty array if there are no
   * more docs to be read.
   *
   * @returns {Promise<SavedObjectDoc[]}
   * @memberof BatchArrayReader
   */
  public async read() {
    return this.docs.pop() || [];
  }

  /**
   * There is nothing to clean up in the case of an in-memory reader, so this
   * does nothing other than conform to the BatchReader interface.
   *
   * @returns {Promise<void>}
   */
  public close() {
    return Promise.resolve();
  }
}
