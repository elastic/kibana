/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname } from 'path';
import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { REPO_ROOT } from '@kbn/repo-info';

import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { getSourcePath } from '../helpers/source';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { getImportResolver } from '../get_import_resolver';
import { formatSuggestions } from '../helpers/report';
import { isTypeOnlyImport } from '../helpers/ast';
import { isDevOnlyPackage, isImportableFrom, mayImportDevOnlyPackage } from '../helpers/groups';

const DEV_ONLY_SUGGESTIONS = [
  'A devOnly package can only be imported by other devOnly packages, tests, or tooling.',
  'If this file is a test or tool, name or place it so it is classified as such (`.test.ts`, `mocks/`, `scripts/`).',
  'If this package itself should not ship, set `"devOnly": true` in its kibana.jsonc.',
];

export const NoGroupCrossingImportsRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
    messages: {
      ILLEGAL_IMPORT: `⚠ Illegal import statement: "{{importerPackage}}" ({{importerGroup}}) is importing "{{importedPackage}}" ({{importedGroup}}/{{importedVisibility}}). File: {{sourcePath}}\n{{suggestion}}\n`,
      DEV_ONLY_IMPORT: `⚠ Illegal import statement: "{{importerPackage}}" is importing devOnly package "{{importedPackage}}". File: {{sourcePath}}\n{{suggestion}}\n`,
    },
  },
  create(context) {
    const resolver = getImportResolver(context);
    const classifier = getRepoSourceClassifier(resolver);
    const sourcePath = getSourcePath(context);
    const ownDirname = dirname(sourcePath);
    const self = classifier.classify(sourcePath);
    const relativePath = sourcePath.replace(REPO_ROOT, '').replace(/^\//, '');

    return visitAllImportStatements((req, { node, importer }) => {
      if (
        req === null ||
        // we can ignore imports using the ?raw (replacing legacy raw-loader), they will need to be resolved but can be managed on a case by case basis
        req.endsWith('?raw')
      ) {
        return;
      }

      const result = resolver.resolve(req, ownDirname);
      if (result?.type !== 'file' || result.nodeModule) {
        return;
      }

      const imported = classifier.classify(result.absolute);

      if (
        isDevOnlyPackage(imported) &&
        !mayImportDevOnlyPackage(self) &&
        !isTypeOnlyImport(importer)
      ) {
        context.report({
          node: node as Node,
          messageId: 'DEV_ONLY_IMPORT',
          data: {
            importerPackage: self.pkgInfo?.pkgId ?? 'unknown',
            importedPackage: imported.pkgInfo?.pkgId ?? 'unknown',
            sourcePath: relativePath,
            suggestion: formatSuggestions(DEV_ONLY_SUGGESTIONS),
          },
        });
        return;
      }

      if (!isImportableFrom(self, imported.group, imported.visibility)) {
        context.report({
          node: node as Node,
          messageId: 'ILLEGAL_IMPORT',
          data: {
            importerPackage: self.pkgInfo?.pkgId ?? 'unknown',
            importerGroup: self.group,
            importedPackage: imported.pkgInfo?.pkgId ?? 'unknown',
            importedGroup: imported.group,
            importedVisibility: imported.visibility,
            sourcePath: relativePath,
            suggestion: formatSuggestions([
              `Please review the dependencies in your module's manifest (kibana.jsonc).`,
              `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
              `Address the conflicting dependencies by refactoring the code`,
            ]),
          },
        });
        return;
      }
    });
  },
};
