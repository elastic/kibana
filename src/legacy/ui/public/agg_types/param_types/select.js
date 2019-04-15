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

import { IndexedArray } from '../../indexed_array';
import { BaseParamType } from './base';
import { createLegacyClass } from '../../utils/legacy_class';

createLegacyClass(SelectParamType).inherits(BaseParamType);
function SelectParamType(config) {
  SelectParamType.Super.call(this, config);

  this.options = new IndexedArray({
    index: ['value'],
    immutable: true,
    initialSet: this.options
  });
}

/**
 * Serialize a selection to be stored in the database
 * @param  {object} selected - the option that was selected
 * @return {any}
 */
SelectParamType.prototype.serialize = function (selected) {
  return selected.value;
};

/**
 * Take a value that was serialized to the database and
 * return the option that is represents
 *
 * @param  {any} value - the value that was saved
 * @return {object}
 */
SelectParamType.prototype.deserialize = function (value) {
  return this.options.byValue[value];
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
SelectParamType.prototype.write = function (aggConfig, output) {
  output.params[this.name] = aggConfig.params[this.name].value;
};

export { SelectParamType };
