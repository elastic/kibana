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
import { isImportableFrom } from '../helpers/groups';

export const NoGroupCrossingImportsRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
    messages: {
      ILLEGAL_IMPORT: `⚠ Illegal import statement: "{{importerPackage}}" ({{importerGroup}}) is importing "{{importedPackage}}" ({{importedGroup}}/{{importedVisibility}}). File: {{sourcePath}}\n{{suggestion}}\n`,
    },
  },
  create(context) {
    const resolver = getImportResolver(context);
    const classifier = getRepoSourceClassifier(resolver);
    const sourcePath = getSourcePath(context);
    const ownDirname = dirname(sourcePath);
    const self = classifier.classify(sourcePath);
    const relativePath = sourcePath.replace(REPO_ROOT, '').replace(/^\//, '');

    return visitAllImportStatements((req, { node }) => {
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
