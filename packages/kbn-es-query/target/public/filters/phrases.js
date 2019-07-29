function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
import { getPhraseScript } from './phrase'; // Creates a filter where the given field matches one or more of the given values
// params should be an array of values

export function buildPhrasesFilter(field, params, indexPattern) {
  var index = indexPattern.id;
  var type = 'phrases';
  var key = field.name;
  var value = params.map(function (value) {
    return format(field, value);
  }).join(', ');
  var filter = {
    meta: {
      index: index,
      type: type,
      key: key,
      value: value,
      params: params
    }
  };
  var should;

  if (field.scripted) {
    should = params.map(function (value) {
      return {
        script: getPhraseScript(field, value)
      };
    });
  } else {
    should = params.map(function (value) {
      return {
        match_phrase: _defineProperty({}, field.name, value)
      };
    });
  }

  filter.query = {
    bool: {
      should: should,
      minimum_should_match: 1
    }
  };
  return filter;
}

function format(field, value) {
  return field && field.format && field.format.convert ? field.format.convert(value) : value;
}