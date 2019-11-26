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

import { KIBANA_STATS_TYPE } from '../../common/constants';
import { Collector } from './collector';

export class UsageCollector extends Collector {
  /*
   * @param {Object} logger - logger object
   * @param {String} options.type - property name as the key for the data
   * @param {Function} options.init (optional) - initialization function
   * @param {Function} options.fetch - function to query data
   * @param {Function} options.formatForBulkUpload - optional
   * @param {Function} options.rest - optional other properties
   */
  constructor(logger, { type, init, fetch, formatForBulkUpload = null, ...options } = {}) {
    super(logger, { type, init, fetch, formatForBulkUpload, ...options });

    /*
     * Currently, for internal bulk uploading, usage stats are part of
     * `kibana_stats` type, under the `usage` namespace in the document.
     */
    const defaultUsageFormatterForBulkUpload = result => {
      return {
        type: KIBANA_STATS_TYPE,
        payload: {
          usage: {
            [type]: result
          }
        }
      };
    };
    this._formatForBulkUpload = formatForBulkUpload || defaultUsageFormatterForBulkUpload;
  }
}
