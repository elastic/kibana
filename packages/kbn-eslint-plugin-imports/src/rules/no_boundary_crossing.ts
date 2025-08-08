/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { TSESTree } from '@typescript-eslint/typescript-estree';
import * as Bt from '@babel/types';
import type { Rule } from 'eslint';
import type { Node } from 'estree';
import type { ModuleType } from '@kbn/repo-source-classifier';

import { visitAllImportStatements, Importer } from '../helpers/visit_all_import_statements';
import { getSourcePath } from '../helpers/source';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { getImportResolver } from '../get_import_resolver';
import { formatSuggestions, toList } from '../helpers/report';

const ANY = Symbol();

const IMPORTABLE_FROM: Record<ModuleType, ModuleType[] | typeof ANY> = {
  'non-package': ['non-package', 'server package', 'browser package', 'common package', 'static'],
  'server package': ['common package', 'server package', 'static'],
  'browser package': ['common package', 'browser package', 'static'],
  'common package': ['common package', 'static'],

  static: [],
  'tests or mocks': ANY,
  tooling: ANY,
};

const isTypeOnlyImport = (importer: Importer) => {
  // handle babel nodes
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

export const NoBoundaryCrossingRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
    messages: {
      TYPE_MISMATCH: `"{{importedType}}" code can not be imported from "{{ownType}}" code.{{suggestion}}`,
    },
  },
  create(context) {
    const resolver = getImportResolver(context);
    const classifier = getRepoSourceClassifier(resolver);
    const sourcePath = getSourcePath(context);
    const ownDirname = Path.dirname(sourcePath);

    const self = classifier.classify(sourcePath);
    const importable = IMPORTABLE_FROM[self.type];

    return visitAllImportStatements((req, { node, importer, type }) => {
      if (
        req === null ||
        // we can ignore imports using the ?raw (replacing legacy raw-loader), they will need to be resolved but can be managed on a case by case basis
        req.endsWith('?raw') ||
        // type only imports can stretch across all the boundaries
        isTypeOnlyImport(importer)
      ) {
        return;
      }

      const result = resolver.resolve(req, ownDirname);
      if (result?.type !== 'file' || result.nodeModule) {
        return;
      }

      const imported = classifier.classify(result.absolute);

      if (importable === ANY) {
        return;
      }

      if (!importable.includes(imported.type)) {
        context.report({
          node: node as Node,
          messageId: 'TYPE_MISMATCH',
          data: {
            ownType: self.type,
            importedType: imported.type,
            suggestion: formatSuggestions([
              self.type.endsWith(' package') && imported.type === 'tests or mocks'
                ? 'To expose mocks to other packages, they should be in their own package that is consumed by this package.'
                : '',
              `Remove the import statement.`,
              importable.length > 0 ? `Limit your imports to ${toList(importable)} code.` : '',
              `Covert to a type-only import.`,
              `Reach out to #kibana-operations for help.`,
            ]),
          },
        });
        return;
      }
    });
  },
};
