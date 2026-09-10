/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { parseKbnImportReq } from '@kbn/repo-packages';

import { isTypeOnlyImport } from '../helpers/ast';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { getSourcePath } from '../helpers/source';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { getImportResolver } from '../get_import_resolver';

/**
 * ESLint rule that validates cross-plugin imports target declared `extraPublicDirs`.
 *
 * This is the lint-time complement to the build-time validation in the
 * optimizer's `createCrossPluginExternals` (callback-style externals) and
 * `CrossPluginTargetValidationPlugin`. It catches undeclared target imports
 * early, before they reach the bundler.
 *
 * **Safety guards matching the bundler's semantics:**
 *
 * - Guard 1: Only validate browser and common code — target validation only
 *   applies during browser bundle compilation. Server code, non-package code
 *   (CLI tools, build scripts), test fixtures, and tooling resolve imports via
 *   Node.js module resolution and are never subject to target validation.
 *
 * - Guard 2: Skip type-only imports — TypeScript erases these before
 *   bundling, so the bundler never sees them. Runtime-only check.
 *
 * - Guard 3: Skip non-@kbn imports — `parseKbnImportReq` returns undefined
 *   for non-scoped imports; nothing to validate.
 *
 * - Guard 4: Skip same-plugin imports — only remotes (other bundles) are
 *   validated. Self-imports resolve via normal module resolution within the
 *   same compilation.
 *
 * - Guard 5: Only validate browser plugin packages — Non-browser (server-only)
 *   plugins like `@kbn/data-catalog-plugin` are not part of the
 *   `__kbnBundles__` system. Their common/ code is importable from anywhere
 *   via normal module resolution (e.g., shared constants in common/).
 *
 * - Guard 6: Skip .json and ?raw imports — these are never cross-plugin
 *   externals.
 *
 * - Validation uses **prefix matching**: `parsed.target` must either equal a
 *   declared target exactly, or start with `target + '/'`. This handles both
 *   simple targets (`common` matches `common/search/types`) and multi-segment
 *   targets (`common/trigger_ids` matches `common/trigger_ids` exactly but
 *   NOT `common/other`). Bare plugin imports (empty target) never match.
 *
 * @see packages/kbn-optimizer/src/config/create_external_plugin_config.ts (build-time equivalent)
 * @see packages/kbn-optimizer/src/plugins/cross_plugin_target_validation_plugin.ts (dist-build validation)
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
      // tooling all resolve imports via Node.js module resolution and are never
      // subject to target validation.
      if (self.type !== 'browser package' && self.type !== 'common package') return;

      // Guard 2: skip type-only imports (erased before bundling)
      if (isTypeOnlyImport(importer)) return;

      // Guard 6: skip .json and ?raw imports (never cross-plugin externals)
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
