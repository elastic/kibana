/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { Project, SourceFile, Node } from 'ts-morph';
import { ApiScope, PluginOrPackage } from './types';
import { isNamedNode, getSourceFileMatching } from './tsmorph_utils';

/**
 * Determines which file in the project to grab nodes from, depending on the plugin and scope, then returns those nodes.
 *
 * @param project - TS project.
 * @param plugin - The plugin we are interested in.
 * @param scope - The "scope"  of the API we want to extract: public, server or common.
 * @param log - logging utility.
 *
 * @return Every publically exported Node from the given plugin and scope (public, server, common).
 */
export function getDeclarationNodesForPluginScope(
  project: Project,
  plugin: PluginOrPackage,
  scope: ApiScope,
  log: ToolingLog
): Node[] {
  // Packages specify the intended scope in the package.json, while plugins specify the scope
  // using folder structure.
  if (!plugin.isPlugin && scope !== plugin.scope) return [];

  const path = plugin.isPlugin
    ? Path.join(`${plugin.directory}`, scope.toString(), 'index.ts')
    : Path.join(`${plugin.directory}`, 'src', 'index.ts');
  const file = getSourceFileMatching(project, path);

  if (file) {
    return getExportedFileDeclarations(file, log);
  } else {
    log.debug(`No file found: ${path}`);
    return [];
  }
}

/**
 *
 * @param source the file we want to extract exported declaration nodes from.
 * @param log
 */
function getExportedFileDeclarations(source: SourceFile, log: ToolingLog): Node[] {
  const nodes: Node[] = [];
  const exported = source.getExportedDeclarations();

  // Filter out the exported declarations that exist only for the plugin system itself.
  exported.forEach((val) => {
    val.forEach((ed) => {
      const name: string = isNamedNode(ed) ? ed.getName() : '';

      // Every plugin will have an export called "plugin". Don't bother listing
      // it, it's only for the plugin infrastructure.
      // Config is also a common export on the server side that is just for the
      // plugin infrastructure.
      if (name === 'plugin' || name === 'config') {
        return;
      }
      if (name && name !== '') {
        nodes.push(ed);
      } else {
        log.warning(`API with missing name encountered, text is ` + ed.getText().substring(0, 50));
      }
    });
  });

  log.debug(`Collected ${nodes.length} exports from file ${source.getFilePath()}`);
  return nodes;
}
