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
import { REPO_ROOT } from '@kbn/repo-info';

import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { getSourcePath } from '../helpers/source';
import { formatSuggestions } from '../helpers/report';

const CORE_INTERNAL_SUBPATH = /^@kbn\/core-.+\/internal$/;

export const NoCoreInternalImportsRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_core_internal_imports',
    },
    messages: {
      CORE_INTERNAL_IMPORT: `Importing "{{importRequest}}" is not allowed outside of src/core/.{{suggestion}}`,
    },
  },
  create(context) {
    const sourcePath = getSourcePath(context);
    const relativePath = sourcePath.replace(REPO_ROOT, '').replace(/^\//, '');
    const isInsideCore = relativePath.startsWith('src/core/');

    if (isInsideCore) {
      return {};
    }

    return visitAllImportStatements((req, { node }) => {
      if (req === null) {
        return;
      }

      if (CORE_INTERNAL_SUBPATH.test(req)) {
        context.report({
          node: node as Node,
          messageId: 'CORE_INTERNAL_IMPORT',
          data: {
            importRequest: req,
            suggestion: formatSuggestions([
              `The /internal subpath of core packages is reserved for use within src/core/.`,
              `Import from the package's public API instead (e.g. '@kbn/core-*-server' without '/internal').`,
              `Reach out to #kibana-core for help.`,
            ]),
          },
        });
      }
    });
  },
};
