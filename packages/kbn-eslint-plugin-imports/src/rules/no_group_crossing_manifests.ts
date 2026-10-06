/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { Context, CreateOnceRule } from '@oxlint/plugins';
import { getPackages, getPluginPackagesFilter } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ModuleGroup, ModuleVisibility } from '@kbn/projects-solutions-groups';
import type { SomeNode } from '../helpers/ast';
import { getSourcePath } from '../helpers/source';
import { getImportResolver } from '../get_import_resolver';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { isImportableFrom } from '../helpers/groups';
import { formatSuggestions } from '../helpers/report';

interface PluginInfo {
  id: string;
  pluginId: string;
  group: ModuleGroup;
  visibility: ModuleVisibility;
}

interface ManifestViolation {
  currentPlugin: PluginInfo;
  offendingDependencies: PluginInfo[];
  manifestPath: string;
}

/**
 * Find the plugins that the manifest of the plugin owning the linted file depends on across
 * group boundaries. Returns `null` when the file isn't part of a plugin or there are none.
 */
function findManifestViolation(context: Context): ManifestViolation | null {
  const sourcePath = getSourcePath(context);
  const resolver = getImportResolver(context);
  const classifier = getRepoSourceClassifier(resolver);
  const moduleId = classifier.classify(sourcePath);

  if (moduleId.manifest?.type !== 'plugin') {
    return null;
  }

  const allPlugins = getPackages(REPO_ROOT).filter(getPluginPackagesFilter());
  const currentPluginInfo = moduleId.manifest.plugin;
  const offendingDependencies: PluginInfo[] = [];
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

  if (!offendingDependencies.length) {
    return null;
  }

  return {
    currentPlugin: {
      id: moduleId.pkgInfo!.pkgId,
      pluginId: currentPluginInfo.id,
      group: moduleId.group,
      visibility: moduleId.visibility,
    },
    offendingDependencies,
    manifestPath: join(moduleId.pkgInfo!.pkgDir, 'kibana.jsonc')
      .replace(REPO_ROOT, '')
      .replace(/^\//, ''),
  };
}

export const NoGroupCrossingManifestsRule: CreateOnceRule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
    messages: {
      ILLEGAL_MANIFEST_DEPENDENCY: `{{violations}}\n{{suggestion}}`,
    },
  },
  createOnce(context) {
    // `undefined` until the file declares a plugin entry point, then the manifest check result
    let violation: ManifestViolation | null | undefined;

    const reportManifestViolation = (node: SomeNode) => {
      if (violation === undefined) {
        violation = findManifestViolation(context);
      }
      if (violation) {
        reportViolation({ context, node, ...violation });
      }
    };

    return {
      before() {
        violation = undefined;
      },
      FunctionDeclaration(node) {
        // complain in exported plugin() function
        if (node.id?.name === 'plugin' && node.parent.type === 'ExportNamedDeclaration') {
          reportManifestViolation(node);
        }
      },
      MethodDefinition(node) {
        const classNode = node.parent.parent;
        // complain in setup() and start() hooks
        if (
          node.key.type === 'Identifier' &&
          (node.key.name === 'setup' || node.key.name === 'start') &&
          node.kind === 'method' &&
          classNode?.type === 'ClassDeclaration' &&
          (classNode.id?.name.includes('Plugin') ||
            classNode.implements?.find(
              (value) =>
                value.expression.type === 'Identifier' && value.expression.name === 'Plugin'
            ))
        ) {
          reportManifestViolation(node);
        }
      },
    };
  },
};

interface ReportViolationParams extends ManifestViolation {
  context: Context;
  node: SomeNode;
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
