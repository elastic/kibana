/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

export const NoGroupCrossingRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
    messages: {
      PLUGIN_GROUP_MISMATCH: `The plugin "{{ownId}}" (from the "{{ownGroup}}" group) has specified dependencies on private modules.\n{{reason}}\n{{suggestion}}`,
    },
  },
  create(context) {
    const sourcePath = getSourcePath(context);
    const resolver = getImportResolver(context);
    const classifier = getRepoSourceClassifier(resolver);
    const moduleId = classifier.classify(sourcePath);
    const groupViolations: Array<{
      pluginId: string;
      group: ModuleGroup;
      visibility: ModuleVisibility;
    }> = [];

    if (moduleId.manifest?.type === 'plugin') {
      const allPlugins = getPackages(REPO_ROOT).filter(getPluginPackagesFilter());
      const currentPlugin = moduleId.manifest!.plugin;
      // check all the dependencies in the manifest, looking for plugin violations
      [
        ...(currentPlugin.requiredPlugins ?? []),
        ...(currentPlugin.requiredBundles ?? []),
        ...(currentPlugin.optionalPlugins ?? []),
        ...(currentPlugin.runtimePluginDependencies ?? []),
      ].forEach((pluginId) => {
        const dependency = allPlugins.find(({ manifest }) => manifest.plugin.id === pluginId);
        if (dependency) {
          // at this point, we know the dependency is a plugin
          const { group, visibility } = dependency;
          if (moduleId.manifest && !isImportableFrom(moduleId.group, group, visibility)) {
            groupViolations.push({ pluginId, group, visibility });
          }
        }
      });
    }

    return {
      FunctionDeclaration(node) {
        // complain in exported plugin() function
        if (
          groupViolations.length &&
          node.id?.name === 'plugin' &&
          node.parent.type === NODE_TYPES.ExportNamedDeclaration
        ) {
          context.report({
            node: node as Node,
            messageId: 'PLUGIN_GROUP_MISMATCH',
            data: {
              ownId: moduleId.pkgInfo!.pkgId,
              ownGroup: moduleId.group,
              reason: [
                'The following dependencies have been found in the manifest, which are not allowed:\n',
                ...groupViolations.map(
                  ({ pluginId, group, visibility }) =>
                    `⚠ Cannot depend on "${pluginId}" from ${visibility} group "${group}".`
                ),
              ].join('\n'),
              suggestion: formatSuggestions([
                `Please review the dependencies in your plugin's manifest (kibana.jsonc).`,
                `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
                `Address the conflicting dependencies by refactoring the code and ...`,
                `... extracting static code into shared packages.`,
                `... moving services into a 'src/platform/plugins/shared' or 'x-pack/platform/plugins/shared' plugin.`,
              ]),
            },
          });
        }
      },
      MethodDefinition(node) {
        // complain in setup() and start() hooks
        if (
          groupViolations.length &&
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
          context.report({
            node: node as Node,
            messageId: 'PLUGIN_GROUP_MISMATCH',
            data: {
              ownId: moduleId.pkgInfo!.pkgId,
              ownGroup: moduleId.group,
              reason: [
                'The following dependencies have been found in the manifest, which are not allowed:\n',
                ...groupViolations.map(
                  ({ pluginId, group, visibility }) =>
                    `⚠ Cannot depend on "${pluginId}" from ${visibility} group "${group}".`
                ),
              ].join('\n'),
              suggestion: formatSuggestions([
                `Please review the dependencies in your plugin's manifest (kibana.jsonc).`,
                `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
                `Address the conflicting dependencies by refactoring the code and ...`,
                `... extracting static code into shared packages.`,
                `... moving services into a 'src/platform/plugins/shared' or 'x-pack/platform/plugins/shared' plugin.`,
              ]),
            },
          });
        }
      },
    };
  },
};
