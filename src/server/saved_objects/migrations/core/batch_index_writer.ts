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
 * This provides a class which writes documents in bulk to an elastic index.
*/

import _ from 'lodash';
import {
  BatchWriter,
  BulkResult,
  CallCluster,
  RawDoc,
  SavedObjectDoc,
} from './types';

interface Opts {
  callCluster: CallCluster;
  index: string;
}

/**
 * Writes saved object documents in bulk to an index.
 */
export class BatchIndexWriter implements BatchWriter {
  private callCluster: CallCluster;
  private index: string;

  /**
   * Creates an instance of BatchIndexWriter.
   * @param {Opts} opts
   * @prop {CallCluster} callCluster - The elastic connection
   * @prop {string} index - The index being written to
   * @memberof BatchIndexWriter
   */
  constructor(opts: Opts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
  }

  /**
   * Writes the specified documents to the index, throws an exception
   * if any of the documents fail to save.
   *
   * @param {SavedObjectDoc[]} docs - The saved object docs being written.
   * @memberof BatchIndexWriter
   */
  public async write(docs: SavedObjectDoc[]) {
    const { callCluster, index } = this;
    const result = await callCluster('bulk', {
      body: docs.reduce((acc: object[], doc: SavedObjectDoc) => {
        const raw = savedObjectToRaw(doc);

        acc.push({
          index: {
            _id: raw._id,
            _index: index,
            _type: 'doc',
          },
        });

        acc.push(raw._source);

        return acc;
      }, []),
    });

    assertSuccess(result);
  }
}

/**
 * Checks the results of an elasticsearch bulk operation. Finds the first error, if any, and
 * throws an exception describing it.
 */
function assertSuccess(result: BulkResult) {
  const err = _.find(result.items, 'index.error.reason');

  if (!err) {
    return;
  }

  const exception: any = new Error(err.index.error!.reason);
  exception.detail = err;
  throw exception;
}

/**
 * Converts a saved object document from saved object format to the raw underlying shape
 * expected by calls to the elasticsearch API.
 */
function savedObjectToRaw(savedObj: SavedObjectDoc): RawDoc {
  const { id, type, attributes } = savedObj;
  const source = {
    ...savedObj,
    [type]: attributes,
  };

  delete source.id;
  delete source.attributes;

  return {
    _id: `${type}:${id}`,
    _source: source,
  };
}
