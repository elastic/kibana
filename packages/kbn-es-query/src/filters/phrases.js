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

import { getPhraseScript } from './phrase';

// Creates a filter where the given field matches one or more of the given values
// params should be an array of values
export function buildPhrasesFilter(field, params, indexPattern) {
  const index = indexPattern.id;
  const type = 'phrases';
  const key = field.name;
  const value = params.map(value => format(field, value)).join(', ');

  const filter = {
    meta: { index, type, key, value, params },
  };

  let should;
  if (field.scripted) {
    should = params.map(value => ({
      script: getPhraseScript(field, value),
    }));
  } else {
    should = params.map(value => ({
      match_phrase: {
        [field.name]: value,
      },
    }));
  }

  filter.query = {
    bool: {
      should,
      minimum_should_match: 1,
    },
  };

  return filter;
}

function format(field, value) {
  return field && field.format && field.format.convert ? field.format.convert(value) : value;
}
