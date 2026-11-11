/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname } from 'path';
import type { CreateOnceRule } from '@oxlint/plugins';
import { REPO_ROOT } from '@kbn/repo-info';

import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { getImportResolver } from '../get_import_resolver';
import { formatSuggestions } from '../helpers/report';
import type { ImportViolation } from '../helpers/groups';
import { getImportViolation } from '../helpers/groups';

const SUGGESTIONS: Record<ImportViolation, string> = {
  ILLEGAL_IMPORT: formatSuggestions([
    `Please review the dependencies in your module's manifest (kibana.jsonc).`,
    `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
    `Address the conflicting dependencies by refactoring the code`,
  ]),
  CORE_PRIVATE_IMPORT: formatSuggestions([
    `Import the public Core package instead (@kbn/core-<domain>-server, @kbn/core-<domain>-browser, or @kbn/core-<domain>-common).`,
    `If the public package does not expose what you need, ask @elastic/kibana-core for a public API.`,
  ]),
};

export const NoGroupCrossingImportsRule: CreateOnceRule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
    messages: {
      ILLEGAL_IMPORT: `⚠ Illegal import statement: "{{importerPackage}}" ({{importerGroup}}) is importing "{{importedPackage}}" ({{importedGroup}}/{{importedVisibility}}). File: {{sourcePath}}\n{{suggestion}}\n`,
      CORE_PRIVATE_IMPORT: `⚠ Illegal import statement: "{{importedPackage}}" is private to Core and can only be imported from src/core. File: {{sourcePath}}\n{{suggestion}}\n`,
    },
  },
  createOnce(context) {
    return visitAllImportStatements(() => {
      const resolver = getImportResolver(context);
      const classifier = getRepoSourceClassifier(resolver);
      const sourcePath = context.physicalFilename;
      const ownDirname = dirname(sourcePath);
      const self = classifier.classify(sourcePath);
      const relativePath = sourcePath.replace(REPO_ROOT, '').replace(/^\//, '');

      return (req, { node }) => {
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
        const violation = getImportViolation(self, imported);

        if (violation) {
          context.report({
            node,
            messageId: violation,
            data: {
              importerPackage: self.pkgInfo?.pkgId ?? 'unknown',
              importerGroup: self.group,
              importedPackage: imported.pkgInfo?.pkgId ?? 'unknown',
              importedGroup: imported.group,
              importedVisibility: imported.visibility,
              sourcePath: relativePath,
              suggestion: SUGGESTIONS[violation],
            },
          });
        }
      };
    });
  },
};
