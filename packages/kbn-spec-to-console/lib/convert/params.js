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

module.exports = (params) => {
  const result = {};
  Object.keys(params).forEach((param) => {
    const { type, description = '', options = [] } = params[param];
    const [, defaultValue] = description.match(/\(default: (.*)\)/) || [];
    switch (type) {
      case undefined:
        // { description: 'TODO: ?' }
        break;
      case 'int':
        result[param] = 0;
        break;
      case 'double':
        result[param] = 0.0;
        break;
      case 'enum':
        // This is to clean up entries like: "d (Days)". We only want the "d" part.
        if (param === 'time') {
          result[param] = options.map((option) => option.split(' ')[0]);
        } else {
          result[param] = options;
        }
        break;
      case 'boolean':
        result[param] = '__flag__';
        break;
      case 'time':
      case 'date':
      case 'string':
      case 'number':
      case 'number|string':
        result[param] = defaultValue || '';
        break;
      case 'list':
        result[param] = [];
        break;
      default:
        throw new Error(`Unexpected type ${type}`);
    }
  });
  return result;
};
