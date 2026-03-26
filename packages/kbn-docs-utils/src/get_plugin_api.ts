/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Node, Project } from 'ts-morph';
import type { ToolingLog } from '@kbn/tooling-log';
import type { PluginOrPackage, UnnamedExport } from './types';
import { ApiScope, Lifecycle } from './types';
import type { ApiDeclaration, PluginApi } from './types';
import { buildApiDeclarationTopNode } from './build_api_declarations/build_api_declaration';
import { getDeclarationNodesForPluginScope } from './get_declaration_nodes_for_plugin';
import { getSourceFileMatching } from './tsmorph_utils';

/**
 * Warnings encountered during plugin API collection.
 */
export interface PluginApiWarnings {
  unnamedExports: UnnamedExport[];
}

/**
 * Result of collecting plugin API, including any warnings found.
 */
export interface PluginApiResult {
  pluginApi: PluginApi;
  warnings: PluginApiWarnings;
}

/**
 * Collects all the information necessary to generate this plugins mdx api file(s).
 */
export function getPluginApi(
  project: Project,
  plugin: PluginOrPackage,
  plugins: PluginOrPackage[],
  log: ToolingLog,
  captureReferences: boolean
): PluginApiResult {
  const clientResult = getDeclarations(
    project,
    plugin,
    ApiScope.CLIENT,
    plugins,
    log,
    captureReferences
  );
  const serverResult = getDeclarations(
    project,
    plugin,
    ApiScope.SERVER,
    plugins,
    log,
    captureReferences
  );
  const commonResult = getDeclarations(
    project,
    plugin,
    ApiScope.COMMON,
    plugins,
    log,
    captureReferences
  );

  const unnamedExports = [
    ...clientResult.unnamedExports,
    ...serverResult.unnamedExports,
    ...commonResult.unnamedExports,
  ];

  return {
    pluginApi: {
      id: plugin.id,
      client: clientResult.declarations,
      server: serverResult.declarations,
      common: commonResult.declarations,
      serviceFolders: plugin.manifest.serviceFolders,
    },
    warnings: {
      unnamedExports,
    },
  };
}

interface DeclarationResult {
  declarations: ApiDeclaration[];
  unnamedExports: UnnamedExport[];
}

/**
 * Returns all exported ApiDeclarations for the given plugin and scope (client, server, common),
 * along with any unnamed exports that were encountered.
 */
function getDeclarations(
  project: Project,
  plugin: PluginOrPackage,
  scope: ApiScope,
  plugins: PluginOrPackage[],
  log: ToolingLog,
  captureReferences: boolean
): DeclarationResult {
  const { nodes, unnamedExports } = getDeclarationNodesForPluginScope(project, plugin, scope, log);

  const contractTypes = getContractTypes(project, plugin, scope);

  const declarations = nodes.reduce<ApiDeclaration[]>((acc, node) => {
    const apiDec = buildApiDeclarationTopNode(node, {
      plugins,
      log,
      currentPluginId: plugin.id,
      scope,
      captureReferences,
    });
    // Filter out apis with the @internal flag on them.
    if (!apiDec.tags || apiDec.tags.indexOf('internal') < 0) {
      // buildApiDeclaration doesn't set the lifecycle, so we set it here.
      const lifecycle = getLifecycle(node, contractTypes);
      acc.push({
        ...apiDec,
        lifecycle,
        initialIsOpen: lifecycle !== undefined,
      });
    }
    return acc;
  }, []);

  // We have all the ApiDeclarations, now lets group them by typescript kinds.
  return { declarations, unnamedExports };
}

/**
 * Checks if this node is one of the special start or setup contract interface types. We pull these
 * to the top of the API docs.
 *
 * @param node ts-morph node
 * @param contractTypeNames the start and setup contract interface names
 * @returns Which, if any, lifecycle contract this node happens to represent.
 */
function getLifecycle(
  node: Node,
  contractTypeNames: { start?: string; setup?: string }
): Lifecycle | undefined {
  // Note this logic is not tested if a plugin uses "as",
  // like export { Setup as MyPluginSetup } from ..."
  if (contractTypeNames.start && node.getType().getText() === contractTypeNames.start) {
    return Lifecycle.START;
  }

  if (contractTypeNames.setup && node.getType().getText() === contractTypeNames.setup) {
    return Lifecycle.SETUP;
  }
}

/**
 *
 * @param project
 * @param plugin the plugin we are interested in.
 * @param scope Whether we are interested in the client or server plugin contracts.
 * Common scope will never return anything.
 * @returns the name of the two types used for Start and Setup contracts, if they
 * exist and were exported from the plugin class.
 */
function getContractTypes(
  project: Project,
  plugin: PluginOrPackage,
  scope: ApiScope
): { setup?: string; start?: string } {
  const contractTypes: { setup?: string; start?: string } = {};
  const file = getSourceFileMatching(
    project,
    Path.join(`${plugin.directory}`, scope.toString(), 'plugin.ts')
  );
  if (file) {
    file.getClasses().forEach((c) => {
      c.getImplements().forEach((i) => {
        let index = 0;
        i.getType()
          .getTypeArguments()
          .forEach((arg) => {
            // Setup type comes first
            if (index === 0) {
              contractTypes.setup = arg.getText();
            } else if (index === 1) {
              contractTypes.start = arg.getText();
            }
            index++;
          });
      });
    });
  }
  return contractTypes;
}
