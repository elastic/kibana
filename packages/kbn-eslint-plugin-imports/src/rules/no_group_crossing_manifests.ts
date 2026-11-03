/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { Context, CreateOnceRule, DiagnosticData } from '@oxlint/plugins';
import { getPackages, getPluginPackagesFilter } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeNode } from '../helpers/ast';
import { getImportResolver } from '../get_import_resolver';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { isImportableFrom } from '../helpers/groups';
import { formatSuggestions } from '../helpers/report';

/**
 * Build the report data for the plugins that the manifest of the plugin owning the linted file
 * depends on across group boundaries. Returns `null` when the file isn't part of a plugin or there
 * are none.
 */
function getManifestViolationData(context: Context): DiagnosticData | null {
  const resolver = getImportResolver(context);
  const classifier = getRepoSourceClassifier(resolver);
  const moduleId = classifier.classify(context.physicalFilename);

  if (moduleId.manifest?.type !== 'plugin') {
    return null;
  }

  const manifestPath = join(moduleId.pkgInfo!.pkgDir, 'kibana.jsonc')
    .replace(REPO_ROOT, '')
    .replace(/^\//, '');
  const allPlugins = getPackages(REPO_ROOT).filter(getPluginPackagesFilter());
  const currentPluginInfo = moduleId.manifest.plugin;
  const violations: string[] = [];
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
        violations.push(
          `⚠ Illegal dependency on manifest: Plugin "${currentPluginInfo.id}" (package: "${
            moduleId.pkgInfo!.pkgId
          }"; group: "${
            moduleId.group
          }") depends on "${pluginId}" (package: "${id}"; group: ${group}/${visibility}). File: ${manifestPath}`
        );
      }
    }
  });

  if (!violations.length) {
    return null;
  }

  return {
    violations: violations.join('\n'),
    suggestion: formatSuggestions([
      `Please review the dependencies in your plugin's manifest (kibana.jsonc).`,
      `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
      `Address the conflicting dependencies by refactoring the code`,
    ]),
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
    let violationData: DiagnosticData | null | undefined;

    const reportManifestViolation = (node: SomeNode) => {
      if (violationData === undefined) {
        violationData = getManifestViolationData(context);
      }
      if (violationData) {
        context.report({
          node,
          messageId: 'ILLEGAL_MANIFEST_DEPENDENCY',
          data: violationData,
        });
      }
    };

    return {
      before() {
        violationData = undefined;
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
