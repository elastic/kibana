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

import _ from 'lodash';
import { SavedObjectNotFound } from '../../errors';

function isScriptedPhrase(filter) {
  const value = _.get(filter, ['script', 'script', 'params', 'value']);
  return typeof value !== 'undefined';
}

function getParams(filter, indexPattern) {
  const isScriptedPhraseFilter = isScriptedPhrase(filter);
  const type = 'phrase';
  const key = isScriptedPhraseFilter ? filter.meta.field : Object.keys(filter.query.match)[0];
  const query = isScriptedPhraseFilter ? filter.script.script.params.value : filter.query.match[key].query;
  const params = { query };

  // Sometimes a filter will end up with an invalid index or field param. This could happen for a lot of reasons,
  // for example a user might manually edit the url or the index pattern's ID might change due to
  // external factors e.g. a reindex. We only need the index in order to grab the field formatter, so we fallback
  // on displaying the raw value if the index or field is invalid.
  const value = (indexPattern && indexPattern.fields.byName[key]) ? indexPattern.fields.byName[key].format.convert(query) : query;
  return { type, key, value, params };
}

export function mapPhrase(indexPatterns) {
  return async function (filter) {
    const isScriptedPhraseFilter = isScriptedPhrase(filter);
    if (!_.has(filter, ['query', 'match']) && !isScriptedPhraseFilter) {
      throw filter;
    }

    try {
      const indexPattern = await indexPatterns.get(filter.meta.index);
      return getParams(filter, indexPattern);
    } catch (error) {
      if (error instanceof SavedObjectNotFound) {
        return getParams(filter);
      }
      throw error;
    }
  };
}
