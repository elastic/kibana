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

import {
  getFieldCapabilities,
  resolveTimePattern,
  createNoMatchingIndicesError,
} from './lib';

export class IndexPatternsService {
  constructor(callDataCluster) {
    this._callDataCluster = callDataCluster;
  }

  /**
   *  Get a list of field objects for an index pattern that may contain wildcards
   *
   *  @param {Object} [options={}]
   *  @property {String} options.pattern The moment compatible time pattern
   *  @property {Number} options.metaFields The list of underscore prefixed fields that should
   *                                        be left in the field list (all others are removed).
   *  @return {Promise<Array<Fields>>}
   */
  async getFieldsForWildcard(options = {}) {
    const { pattern, metaFields } = options;
    return await getFieldCapabilities(this._callDataCluster, pattern, metaFields);
  }

  /**
   *  Get a list of field objects for a time pattern
   *
   *  @param {Object} [options={}]
   *  @property {String} options.pattern The moment compatible time pattern
   *  @property {Number} options.lookBack The number of indices we will pull mappings for
   *  @property {Number} options.metaFields The list of underscore prefixed fields that should
   *                                        be left in the field list (all others are removed).
   *  @return {Promise<Array<Fields>>}
   */
  async getFieldsForTimePattern(options = {}) {
    const { pattern, lookBack, metaFields } = options;
    const { matches } = await resolveTimePattern(this._callDataCluster, pattern);
    const indices = matches.slice(0, lookBack);
    if (indices.length === 0) {
      throw createNoMatchingIndicesError(pattern);
    }
    return await getFieldCapabilities(this._callDataCluster, indices, metaFields);
  }

}
