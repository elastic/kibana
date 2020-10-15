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

module.exports = (spec) => {
  const result = {};
  /**
   * TODO:
   * Since https://github.com/elastic/elasticsearch/pull/42346 has been merged into ES master
   * the JSON doc specification has been updated. We need to update this script to take advantage
   * of the added information but it will also require updating console editor autocomplete.
   *
   * Note: for now we exclude all deprecated patterns from the generated spec to prevent them
   * from being used in autocompletion. It would be really nice if we could use this information
   * instead of just not including it.
   */
  Object.keys(spec).forEach((api) => {
    const source = spec[api];

    if (!source.url) {
      return result;
    }

    if (source.url.path) {
      if (source.url.paths.every((path) => Boolean(path.deprecated))) {
        return;
      }
    }

    const convertedSpec = (result[api] = {});
    if (source.params) {
      const urlParams = convertParams(source.params);
      if (Object.keys(urlParams).length > 0) {
        convertedSpec.url_params = urlParams;
      }
    }

    const methodSet = new Set();
    let patterns;
    const urlComponents = {};

    if (source.url.paths) {
      // We filter out all deprecated url patterns here.
      const paths = source.url.paths.filter((path) => !path.deprecated);
      patterns = convertPaths(paths);
      paths.forEach((pathsObject) => {
        pathsObject.methods.forEach((method) => methodSet.add(method));
        if (pathsObject.parts) {
          for (const partName of Object.keys(pathsObject.parts)) {
            urlComponents[partName] = pathsObject.parts[partName];
          }
        }
      });
    }

    convertedSpec.methods = convertMethods(Array.from(methodSet));
    convertedSpec.patterns = patterns;

    if (Object.keys(urlComponents).length) {
      const components = convertParts(urlComponents);
      const hasComponents =
        Object.keys(components).filter((c) => {
          return Boolean(components[c]);
        }).length > 0;
      if (hasComponents) {
        convertedSpec.url_components = convertParts(urlComponents);
      }
    }
    if (source.documentation && source.documentation.url) {
      convertedSpec.documentation = source.documentation.url;
    }
  });

  return result;
};
