/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TSESTree } from '@typescript-eslint/typescript-estree';
import * as Bt from '@babel/types';
import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { parseKbnImportReq } from '@kbn/repo-packages';

import type { Importer } from '../helpers/visit_all_import_statements';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { getSourcePath } from '../helpers/source';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { getImportResolver } from '../get_import_resolver';

/**
 * Detect type-only imports. Replicated from no_boundary_crossing.ts since
 * these are declaration-level checks (importKind/exportKind).
 */
const isTypeOnlyImport = (importer: Importer) => {
  if (Bt.isImportDeclaration(importer)) {
    return (
      importer.importKind === 'type' ||
      importer.specifiers.some((s) => ('importKind' in s ? s.importKind === 'type' : false))
    );
  }

  if (importer.type === TSESTree.AST_NODE_TYPES.ImportDeclaration) {
    return (
      importer.importKind === 'type' ||
      importer.specifiers.some(
        (s) => s.type === TSESTree.AST_NODE_TYPES.ImportSpecifier && s.importKind === 'type'
      )
    );
  }

  if (Bt.isExportNamedDeclaration(importer)) {
    return (
      importer.exportKind === 'type' ||
      importer.specifiers.some((s) => (Bt.isExportSpecifier(s) ? s.exportKind === 'type' : false))
    );
  }

  if (importer.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration) {
    return (
      importer.exportKind === 'type' || importer.specifiers.some((s) => s.exportKind === 'type')
    );
  }

  return false;
};

/**
 * ESLint rule that validates cross-plugin imports target declared `extraPublicDirs`.
 *
 * This is the lint-time complement to the build-time validation in the rspack
 * optimizer's `createCrossPluginExternals` (callback-style externals) and the
 * legacy webpack optimizer's `BundleRemotesPlugin`. It catches undeclared
 * target imports early, before they reach the bundler.
 *
 * **Safety guards matching legacy `BundleRemotesPlugin` semantics:**
 *
 * - Guard 1: Only validate browser and common code — the legacy
 *   `BundleRemotesPlugin` was a webpack plugin that only ran during browser
 *   bundle compilation. Server code, non-package code (CLI tools, build
 *   scripts), test fixtures, and tooling resolve imports via Node.js module
 *   resolution and were never subject to target validation.
 *
 * - Guard 2: Skip type-only imports — TypeScript erases these before
 *   bundling, so the legacy optimizer never saw them. Runtime-only check.
 *
 * - Guard 3: Skip non-@kbn imports — `parseKbnImportReq` returns undefined
 *   for non-scoped imports; nothing to validate.
 *
 * - Guard 4: Skip same-plugin imports — legacy `BundleRemotesPlugin` only
 *   validated remotes (other bundles). Self-imports resolve via normal
 *   module resolution within the same compilation.
 *
 * - Guard 5: Only validate browser plugin packages — Non-browser (server-only)
 *   plugins like `@kbn/data-catalog-plugin` are not part of the
 *   `__kbnBundles__` system and were never included in legacy BundleRemotes.
 *   Their common/ code is importable from anywhere via normal module
 *   resolution (e.g., shared constants in common/).
 *
 * - Guard 6: Skip .json and ?raw imports — Legacy `BundleRemotesPlugin`
 *   excluded these from factorization (lines 111-113).
 *
 * - Validation uses **prefix matching**: `parsed.target` must either equal a
 *   declared target exactly, or start with `target + '/'`. This handles both
 *   simple targets (`common` matches `common/search/types`) and multi-segment
 *   targets (`common/trigger_ids` matches `common/trigger_ids` exactly but
 *   NOT `common/other`). Bare plugin imports (empty target) never match.
 *
 * @see packages/kbn-optimizer/src/worker/bundle_remotes_plugin.ts (legacy equivalent)
 * @see packages/kbn-rspack-optimizer/src/config/create_external_plugin_config.ts (build-time equivalent)
 */
export const NoUndeclaredPluginTargetRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx',
    },
    messages: {
      INVALID_TARGET:
        'import [{{request}}] references a non-public export of the [{{pluginId}}] ' +
        'plugin and must point to one of the public directories: [{{targets}}]',
    },
  },
  create(context) {
    const resolver = getImportResolver(context);
    const classifier = getRepoSourceClassifier(resolver);
    const sourcePath = getSourcePath(context);

    const self = classifier.classify(sourcePath);
    const ownPkgId = resolver.getPackageIdForPath(sourcePath);

    return visitAllImportStatements((req, { node, importer }) => {
      if (!req) return;

      // Guard 1: only validate browser and common code — these are the types that
      // go through the browser bundler and are affected by __kbnBundles__ resolution.
      // Server code, non-package code (CLI tools, build scripts), test fixtures, and
      // tooling all resolve imports via Node.js module resolution and were never
      // validated by the legacy BundleRemotesPlugin (a webpack plugin that only ran
      // during browser bundle compilation).
      if (self.type !== 'browser package' && self.type !== 'common package') return;

      // Guard 2: skip type-only imports (erased before bundling)
      if (isTypeOnlyImport(importer)) return;

      // Guard 6: skip .json and ?raw imports (legacy exclusion)
      if (req.endsWith('.json') || req.endsWith('?raw')) return;

      // Guard 3: skip non-@kbn imports
      const parsed = parseKbnImportReq(req);
      if (!parsed) return;

      // Guard 4: skip same-plugin imports
      if (parsed.pkgId === ownPkgId) return;

      // Guard 5: only validate browser plugin packages
      const manifest = resolver.getPkgManifest(parsed.pkgId);
      if (!manifest || manifest.type !== 'plugin') return;
      if (manifest.plugin.browser === false) return;

      const targets = ['public', ...(manifest.plugin.extraPublicDirs ?? [])];

      // When the importing file lives in common/ code, implicitly allow the
      // remote plugin's common/ directory — common-to-common imports resolve
      // via normal module resolution and are not routed through __kbnBundles__.
      // Only public/ (browser package) code requires the target plugin to
      // declare "common" in extraPublicDirs.
      if (self.type === 'common package' && !targets.includes('common')) {
        targets.push('common');
      }

      const targetMatches = targets.some(
        (t) => parsed.target === t || parsed.target.startsWith(t + '/')
      );
      if (!targetMatches) {
        context.report({
          node: node as Node,
          messageId: 'INVALID_TARGET',
          data: {
            request: req,
            pluginId: manifest.plugin.id,
            targets: targets.join(', '),
          },
        });
      }
    });
  },
};
