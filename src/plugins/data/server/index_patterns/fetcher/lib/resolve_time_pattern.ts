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

import { chain } from 'lodash';
import moment from 'moment';

import { LegacyAPICaller } from 'kibana/server';

import { timePatternToWildcard } from './time_pattern_to_wildcard';
import { callIndexAliasApi, IndicesAliasResponse } from './es_api';

/**
 *  Convert a time pattern into a list of indexes it could
 *  have matched and ones it did match.
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {String} timePattern
 *  @return {Promise<Object>} object that lists the indices that match based
 *                            on a wildcard version of the time pattern (all)
 *                            and the indices that actually match the time
 *                            pattern (matches);
 */
export async function resolveTimePattern(callCluster: LegacyAPICaller, timePattern: string) {
  const aliases = await callIndexAliasApi(callCluster, timePatternToWildcard(timePattern));

  const allIndexDetails = chain<IndicesAliasResponse>(aliases)
    .reduce(
      (acc: string[], index: any, indexName: string) =>
        acc.concat(indexName, Object.keys(index.aliases || {})),
      []
    )
    .sortBy((indexName: string) => indexName)
    .sortedUniq()
    .map((indexName) => {
      const parsed = moment(indexName, timePattern, true);
      if (!parsed.isValid()) {
        return {
          valid: false,
          indexName,
          order: indexName,
          isMatch: false,
        };
      }

      return {
        valid: true,
        indexName,
        order: parsed,
        isMatch: indexName === parsed.format(timePattern),
      };
    })
    .orderBy(['valid', 'order'], ['desc', 'desc'])
    .value();

  return {
    all: allIndexDetails.map((details) => details.indexName),

    matches: allIndexDetails
      .filter((details) => details.isMatch)
      .map((details) => details.indexName),
  };
}
