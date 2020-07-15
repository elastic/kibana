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

import Path from 'path';

import normalizePath from 'normalize-path';

import { REPO_ROOT } from '../repo_root';
import { Plugins } from './discover_plugins';

function* printPlugins(plugins: Plugins) {
  for (const plugin of plugins) {
    const path = plugin.relativeReadmePath || plugin.relativeDir;
    yield '';
    yield `- {kib-repo}blob/{branch}/${path}[${plugin.id}]`;

    if (!plugin.relativeReadmePath || plugin.readmeSnippet) {
      yield '';
      yield plugin.readmeSnippet || 'WARNING: Missing README.';
      yield '';
    }
  }
}

export function generatePluginList(ossPlugins: Plugins, xpackPlugins: Plugins) {
  return `////

NOTE:
  This is an automatically generated file. Please do not edit directly. Instead, run the
  following from within the kibana repository:

    node scripts/build_plugin_list_docs

  You can update the template within ${normalizePath(
    Path.relative(REPO_ROOT, Path.resolve(__dirname, __filename))
  )}

////

[[code-exploration]]
=== Exploring Kibana code

The goals of our folder heirarchy are:

- Easy for developers to know where to add new services, plugins and applications.
- Easy for developers to know where to find the code from services, plugins and applications.
- Easy to browse and understand our folder structure.

To that aim, we strive to:

- Avoid too many files in any given folder.
- Choose clear, unambigious folder names.
- Organize by domain.
- Every folder should contain a README that describes the contents of that folder.

[discrete]
[[kibana-services-applications]]
==== Services and Applications

[discrete]
===== src/plugins
${Array.from(printPlugins(ossPlugins)).join('\n')}

[discrete]
===== x-pack/plugins
${Array.from(printPlugins(xpackPlugins)).join('\n')}
`;
}
