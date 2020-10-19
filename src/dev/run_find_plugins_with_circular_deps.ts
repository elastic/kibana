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

import { parseDependencyTree, parseCircular, prettyCircular } from 'dpdm';
import { run } from '@kbn/dev-utils';

run(async ({ log }) => {
  const depTree = await parseDependencyTree(['{src,x-pack}/plugins/**/*'], {
    include: /(src|x-pack)\/plugins\/.*/,
  });

  const circulars = parseCircular(depTree);
  const filteredCirculars = circulars.filter((circularDeps) => {
    const first = circularDeps[0];
    const last = circularDeps[circularDeps.length - 1];
    const firstMatch = first.match(/(src|x-pack)\/plugins\/([^\/]*)\/.*/);
    const lastMatch = last.match(/(src|x-pack)\/plugins\/([^\/]*)\/.*/);

    if (firstMatch && lastMatch && firstMatch.length === 3 && lastMatch.length === 3) {
      const firstPlugin = `${firstMatch[1]}/plugins/${firstMatch[2]}`;
      const lastPlugin = `${lastMatch[1]}/plugins/${lastMatch[2]}`;
      return firstPlugin !== lastPlugin;
    }

    return false;
  });

  log.warning(prettyCircular(filteredCirculars));
});
