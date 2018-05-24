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
import editorHtml from '../controls/regular_expression.html';
import { BaseParamType } from './base';
import { createLegacyClass } from '../../utils/legacy_class';

createLegacyClass(RegexParamType).inherits(BaseParamType);
function RegexParamType(config) {
  _.defaults(config, { pattern: '' });
  RegexParamType.Super.call(this, config);
}

RegexParamType.prototype.editor = editorHtml;

/**
 * Disabled state of the agg param
 *
 * @return {bool}
 */
RegexParamType.prototype.disabled = function () {
  return false;
};

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
RegexParamType.prototype.write = function (aggConfig, output) {
  const param = aggConfig.params[this.name];
  const paramType = aggConfig.type.params.byName[this.name];

  // clear aggParam if pattern is not set or is disabled
  if (!param || !param.pattern || !param.pattern.length || paramType.disabled(aggConfig)) {
    return;
  }

  const obj = {
    pattern: param.pattern
  };

  output.params[this.name] = obj;
};

export { RegexParamType };
