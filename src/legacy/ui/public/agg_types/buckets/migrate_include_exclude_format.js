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

import { isString, isObject } from 'lodash';

function isType(type) {
  return function (agg) {
    const field = agg.params.field;
    return field && field.type === type;
  };
}

const isStringType = isType('string');

const migrateIncludeExcludeFormat = {
  serialize: function (value, agg) {
    if (this.shouldShow && !this.shouldShow(agg)) return;
    if (!value || isString(value)) return value;
    else return value.pattern;
  },
  write: function (aggConfig, output) {
    const value = aggConfig.params[this.name];

    if (isObject(value)) {
      output.params[this.name] = value.pattern;
    } else if (value && isStringType(aggConfig)) {
      output.params[this.name] = value;
    }
  }
};

export {
  isType,
  isStringType,
  migrateIncludeExcludeFormat
};
