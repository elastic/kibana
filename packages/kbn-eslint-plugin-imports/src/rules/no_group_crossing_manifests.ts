/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { getPackages, getPluginPackagesFilter } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ModuleGroup, ModuleVisibility } from '@kbn/repo-info/types';
import { getSourcePath } from '../helpers/source';
import { getImportResolver } from '../get_import_resolver';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { isImportableFrom } from '../helpers/groups';
import { formatSuggestions } from '../helpers/report';

const NODE_TYPES = TSESTree.AST_NODE_TYPES;

interface PluginInfo {
  id: string;
  pluginId: string;
  group: ModuleGroup;
  visibility: ModuleVisibility;
}

export const NoGroupCrossingManifestsRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
    messages: {
      ILLEGAL_MANIFEST_DEPENDENCY: `{{violations}}\n{{suggestion}}`,
    },
  },
  create(context) {
    const sourcePath = getSourcePath(context);
    let manifestPath: string;
    const resolver = getImportResolver(context);
    const classifier = getRepoSourceClassifier(resolver);
    const moduleId = classifier.classify(sourcePath);
    const offendingDependencies: PluginInfo[] = [];
    let currentPlugin: PluginInfo;

    if (moduleId.manifest?.type === 'plugin') {
      manifestPath = join(moduleId.pkgInfo!.pkgDir, 'kibana.jsonc')
        .replace(REPO_ROOT, '')
        .replace(/^\//, '');
      currentPlugin = {
        id: moduleId.pkgInfo!.pkgId,
        pluginId: moduleId.manifest.plugin.id,
        group: moduleId.group,
        visibility: moduleId.visibility,
      };

      const allPlugins = getPackages(REPO_ROOT).filter(getPluginPackagesFilter());
      const currentPluginInfo = moduleId.manifest!.plugin;
      // check all the dependencies in the manifest, looking for plugin violations
      [
        ...(currentPluginInfo.requiredPlugins ?? []),
        ...(currentPluginInfo.requiredBundles ?? []),
        ...(currentPluginInfo.optionalPlugins ?? []),
        ...(currentPluginInfo.runtimePluginDependencies ?? []),
      ].forEach((pluginId) => {
        const dependency = allPlugins.find(({ manifest }) => manifest.plugin.id === pluginId);
        if (dependency) {
          // at this point, we know the dependency is a plugin
          const { id, group, visibility } = dependency;
          if (!isImportableFrom(moduleId, group, visibility)) {
            offendingDependencies.push({ id, pluginId, group, visibility });
          }
        }
      });
    }

    return {
      FunctionDeclaration(node) {
        // complain in exported plugin() function
        if (
          currentPlugin &&
          offendingDependencies.length &&
          node.id?.name === 'plugin' &&
          node.parent.type === NODE_TYPES.ExportNamedDeclaration
        ) {
          reportViolation({
            context,
            node,
            currentPlugin,
            manifestPath,
            offendingDependencies,
          });
        }
      },
      MethodDefinition(node) {
        // complain in setup() and start() hooks
        if (
          offendingDependencies.length &&
          node.key.type === NODE_TYPES.Identifier &&
          (node.key.name === 'setup' || node.key.name === 'start') &&
          node.kind === 'method' &&
          node.parent.parent.type === NODE_TYPES.ClassDeclaration &&
          (node.parent.parent.id?.name.includes('Plugin') ||
            (node.parent.parent as TSESTree.ClassDeclaration).implements?.find(
              (value) =>
                value.expression.type === NODE_TYPES.Identifier &&
                value.expression.name === 'Plugin'
            ))
        ) {
          reportViolation({
            context,
            node,
            currentPlugin,
            manifestPath,
            offendingDependencies,
          });
        }
      },
    };
  },
};

interface ReportViolationParams {
  context: Rule.RuleContext;
  node: Node;
  currentPlugin: PluginInfo;
  offendingDependencies: PluginInfo[];
  manifestPath: string;
}

const reportViolation = ({
  context,
  node,
  currentPlugin,
  offendingDependencies,
  manifestPath,
}: ReportViolationParams) =>
  context.report({
    node,
    messageId: 'ILLEGAL_MANIFEST_DEPENDENCY',
    data: {
      violations: [
        ...offendingDependencies.map(
          ({ id, pluginId, group, visibility }) =>
            `⚠ Illegal dependency on manifest: Plugin "${currentPlugin.pluginId}" (package: "${currentPlugin.id}"; group: "${currentPlugin.group}") depends on "${pluginId}" (package: "${id}"; group: ${group}/${visibility}). File: ${manifestPath}`
        ),
      ].join('\n'),
      suggestion: formatSuggestions([
        `Please review the dependencies in your plugin's manifest (kibana.jsonc).`,
        `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
        `Address the conflicting dependencies by refactoring the code`,
      ]),
    },
  });
