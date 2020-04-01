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

const numericKeys = ['alpha', 'beta', 'gamma', 'period'];
const booleanKeys = ['pad'];
function castBasedOnKey(key, val) {
  if (~numericKeys.indexOf(key)) return Number(val);
  if (~booleanKeys.indexOf(key)) {
    switch (val) {
      case 'true':
      case 1:
      case '1':
        return true;
      default:
        return false;
    }
  }
  return val;
}
export const parseSettings = settingsStr => {
  return settingsStr.split(/\s/).reduce((acc, value) => {
    const [key, val] = value.split(/=/);
    acc[key] = castBasedOnKey(key, val);
    return acc;
  }, {});
};
