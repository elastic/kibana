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
import editorHtml from '../controls/raw_json.html';
import { BaseParamType } from './base';
import { createLegacyClass } from '../../utils/legacy_class';


createLegacyClass(JsonParamType).inherits(BaseParamType);
function JsonParamType(config) {
  // force name override
  config = _.defaults(config, { name: 'json' });
  JsonParamType.Super.call(this, config);
}

JsonParamType.prototype.editor = editorHtml;

/**
 * Write the aggregation parameter.
 *
 * @param  {AggConfig} aggConfig - the entire configuration for this agg
 * @param  {object} output - the result of calling write on all of the aggregations
 *                         parameters.
 * @param  {object} output.params - the final object that will be included as the params
 *                               for the agg
 * @return {undefined}
 */
JsonParamType.prototype.write = function (aggConfig, output) {
  let paramJson;
  const param = aggConfig.params[this.name];

  if (!param) {
    return;
  }

  // handle invalid Json input
  try {
    paramJson = JSON.parse(param);
  } catch (err) {
    return;
  }

  function filteredCombine(srcA, srcB) {
    function mergeObjs(a, b) {
      return _(a)
        .keys()
        .union(_.keys(b))
        .transform(function (dest, key) {
          const val = compare(a[key], b[key]);
          if (val !== undefined) dest[key] = val;
        }, {})
        .value();
    }

    function mergeArrays(a, b) {
      // attempt to merge each value
      return _.times(Math.max(a.length, b.length), function (i) {
        return compare(a[i], b[i]);
      });
    }

    function compare(a, b) {
      if (_.isPlainObject(a) && _.isPlainObject(b)) return mergeObjs(a, b);
      if (Array.isArray(a) && Array.isArray(b)) return mergeArrays(a, b);
      if (b === null) return undefined;
      if (b !== undefined) return b;
      return a;
    }

    return compare(srcA, srcB);
  }

  output.params = filteredCombine(output.params, paramJson);
  return;
};

export { JsonParamType };
