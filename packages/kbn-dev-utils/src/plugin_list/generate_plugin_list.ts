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

function* printPlugins(plugins: Plugins, includes: string[]) {
  for (const plugin of plugins) {
    const path = plugin.relativeReadmePath || plugin.relativeDir;
    yield '';

    if (plugin.readmeAsciidocAnchor) {
      yield `|<<${plugin.readmeAsciidocAnchor}>>`;

      includes.push(`include::{kibana-root}/${path}[leveloffset=+1]`);
    } else {
      yield `|{kib-repo}blob/{branch}/${path}[${plugin.id}]`;
    }

    if (!plugin.relativeReadmePath || plugin.readmeSnippet) {
      yield plugin.readmeSnippet ? `|${plugin.readmeSnippet}` : '|WARNING: Missing README.';
      yield '';
    }
  }
}

export function generatePluginList(ossPlugins: Plugins, xpackPlugins: Plugins) {
  const includes: string[] = [];

  return `////

NOTE:
  This is an automatically generated file. Please do not edit directly. Instead, run the
  following from within the kibana repository:

    node scripts/build_plugin_list_docs

  You can update the template within ${normalizePath(
    Path.relative(REPO_ROOT, Path.resolve(__dirname, __filename))
  )}

////

[[plugin-list]]
== List of {kib} plugins

[discrete]
=== src/plugins

[%header,cols=2*] 
|===
|Name
|Description

${Array.from(printPlugins(ossPlugins, includes)).join('\n')}

|===

[discrete]
=== x-pack/plugins

[%header,cols=2*] 
|===
|Name
|Description

${Array.from(printPlugins(xpackPlugins, includes)).join('\n')}

|===

${Array.from(includes).join('\n')}
`;
}
