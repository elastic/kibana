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

const { parseDependencyTree, parseCircular, prettyCircular } = require('dpdm');

(async () => {
  const depTree = await parseDependencyTree('src/plugins/**/*', {
    /* options, see below */
    include: /src\/plugins\/.*/,
  });

  const circulars = parseCircular(depTree);
  const filteredCirculars = circulars.filter((circDeps) => {
    const first = circDeps[0];
    const last = circDeps[circDeps.length - 1];
    const firstPlugin = first.match(/src\/plugins\/([^\/]*)\/.*/)[1];
    const lastPlugin = last.match(/src\/plugins\/([^\/]*)\/.*/)[1];
    return firstPlugin !== lastPlugin;
  });

  console.log(prettyCircular(filteredCirculars));
})();
