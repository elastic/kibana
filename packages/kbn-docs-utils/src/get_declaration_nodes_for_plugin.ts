/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Project, SourceFile, Node } from 'ts-morph';
import { type ApiScope, type PluginOrPackage, type UnnamedExport } from './types';
import { isNamedNode, getSourceFileMatching } from './tsmorph_utils';

/**
 * Result of collecting declaration nodes, including any unnamed exports found.
 */
export interface DeclarationNodesResult {
  nodes: Node[];
  unnamedExports: UnnamedExport[];
}

/**
 * Determines which file in the project to grab nodes from, depending on the plugin and scope, then returns those nodes.
 *
 * @param project - TS project.
 * @param plugin - The plugin we are interested in.
 * @param scope - The "scope"  of the API we want to extract: public, server or common.
 * @param log - logging utility.
 *
 * @return Every publicly exported Node from the given plugin and scope (public, server, common),
 *         along with any unnamed exports that were encountered.
 */
export function getDeclarationNodesForPluginScope(
  project: Project,
  plugin: PluginOrPackage,
  scope: ApiScope,
  log: ToolingLog
): DeclarationNodesResult {
  // Packages specify the intended scope in the package.json, while plugins specify the scope
  // using folder structure.
  if (!plugin.isPlugin && scope !== plugin.scope) {
    return { nodes: [], unnamedExports: [] };
  }

  const path = plugin.isPlugin
    ? Path.join(`${plugin.directory}`, scope.toString(), 'index.ts')
    : Path.join(`${plugin.directory}`, 'index.ts');
  const file = getSourceFileMatching(project, path);

  if (file) {
    return getExportedFileDeclarations(file, plugin.id, scope, log);
  } else {
    log.debug(`No file found: ${path}`);
    return { nodes: [], unnamedExports: [] };
  }
}

/**
 * Extracts exported declaration nodes from a source file.
 *
 * @param source - The file we want to extract exported declaration nodes from.
 * @param pluginId - The plugin or package ID for tracking unnamed exports.
 * @param scope - The API scope (client, server, common).
 * @param log - Logging utility.
 * @returns The extracted nodes and any unnamed exports encountered.
 */
function getExportedFileDeclarations(
  source: SourceFile,
  pluginId: string,
  scope: ApiScope,
  log: ToolingLog
): DeclarationNodesResult {
  const nodes: Node[] = [];
  const unnamedExports: UnnamedExport[] = [];
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
        const filePath = source.getFilePath();
        const lineNumber = ed.getStartLineNumber();
        const textSnippet = ed.getText().substring(0, 100).replace(/\n/g, ' ');
        unnamedExports.push({
          pluginId,
          scope,
          path: filePath,
          lineNumber,
          textSnippet,
        });
        log.debug(
          `Unnamed export in ${pluginId} at ${filePath}:${lineNumber}: ${textSnippet.substring(
            0,
            50
          )}`
        );
      }
    });
  });

  log.debug(`Collected ${nodes.length} exports from file ${source.getFilePath()}`);
  if (unnamedExports.length > 0) {
    log.debug(`Found ${unnamedExports.length} unnamed exports in ${source.getFilePath()}`);
  }
  return { nodes, unnamedExports };
}
