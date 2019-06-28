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


const convertParams = require('./convert/params');
const convertMethods = require('./convert/methods');
const convertPaths = require('./convert/paths');
const convertParts = require('./convert/parts');

module.exports = spec => {
  const result = {};
  Object.keys(spec).forEach(api => {
    const source = spec[api];
    if (!source.url) {
      return result;
    }
    const convertedSpec = result[api] = {};
    if (source.url && source.url.params) {
      const urlParams = convertParams(source.url.params);
      if (Object.keys(urlParams).length > 0) {
        convertedSpec.url_params = urlParams;
      }
    }

    if (source.methods) {
      convertedSpec.methods = convertMethods(source.methods);
    }

    if (source.url.paths) {
      convertedSpec.patterns = convertPaths(source.url.paths);
    }

    if (source.url.parts) {
      const components = convertParts(source.url.parts);
      const hasComponents = Object.keys(components).filter(c => {
        return Boolean(components[c]);
      }).length > 0;
      if (hasComponents) {
        convertedSpec.url_components = convertParts(source.url.parts);
      }
    }
    if (source.documentation) {
      convertedSpec.documentation = source.documentation;
    }
  });

  return result;
};
