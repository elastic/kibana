/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import normalizePath from 'normalize-path';
import { REPO_ROOT } from '@kbn/repo-info';

import { Plugins } from './discover_plugins';

const sortPlugins = (plugins: Plugins) => plugins.sort((a, b) => a.id.localeCompare(b.id));

function* printPlugins(plugins: Plugins, includes: string[]) {
  for (const plugin of sortPlugins(plugins)) {
    const path = normalizePath(plugin.relativeReadmePath || plugin.relativeDir);
    yield '';

    if (plugin.readmeAsciidocAnchor) {
      yield `|<<${plugin.readmeAsciidocAnchor}>>`;

      includes.push(`include::{kibana-root}/${path}[leveloffset=+1]`);
    } else {
      yield `|{kib-repo}blob/{branch}/${path}[${plugin.id}]`;
    }

    yield plugin.relativeReadmePath === undefined
      ? '|WARNING: Missing README.'
      : `|${plugin.readmeSnippet}`;

    yield '';
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
