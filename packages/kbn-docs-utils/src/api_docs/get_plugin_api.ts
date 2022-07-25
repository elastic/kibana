/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Node, Project } from 'ts-morph';
import { ToolingLog } from '@kbn/tooling-log';
import { ApiScope, Lifecycle, PluginOrPackage } from './types';
import { ApiDeclaration, PluginApi } from './types';
import { buildApiDeclarationTopNode } from './build_api_declarations/build_api_declaration';
import { getDeclarationNodesForPluginScope } from './get_declaration_nodes_for_plugin';
import { getSourceFileMatching } from './tsmorph_utils';

/**
 * Collects all the information necessary to generate this plugins mdx api file(s).
 */
export function getPluginApi(
  project: Project,
  plugin: PluginOrPackage,
  plugins: PluginOrPackage[],
  log: ToolingLog,
  captureReferences: boolean
): PluginApi {
  const client = getDeclarations(project, plugin, ApiScope.CLIENT, plugins, log, captureReferences);
  const server = getDeclarations(project, plugin, ApiScope.SERVER, plugins, log, captureReferences);
  const common = getDeclarations(project, plugin, ApiScope.COMMON, plugins, log, captureReferences);
  return {
    id: plugin.manifest.id,
    client,
    server,
    common,
    serviceFolders: plugin.manifest.serviceFolders,
  };
}

/**
 *
 * @returns All exported ApiDeclarations for the given plugin and scope (client, server, common), broken into
 * groups of typescript kinds (functions, classes, interfaces, etc).
 */
function getDeclarations(
  project: Project,
  plugin: PluginOrPackage,
  scope: ApiScope,
  plugins: PluginOrPackage[],
  log: ToolingLog,
  captureReferences: boolean
): ApiDeclaration[] {
  const nodes = getDeclarationNodesForPluginScope(project, plugin, scope, log);

  const contractTypes = getContractTypes(project, plugin, scope);

  const declarations = nodes.reduce<ApiDeclaration[]>((acc, node) => {
    const apiDec = buildApiDeclarationTopNode(node, {
      plugins,
      log,
      currentPluginId: plugin.manifest.id,
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
  return declarations;
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
