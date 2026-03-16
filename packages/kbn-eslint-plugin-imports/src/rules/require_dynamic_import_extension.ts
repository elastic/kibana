/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import type { Rule } from 'eslint';
import { getRelativeImportReq } from '@kbn/import-resolver';

import { report } from '../helpers/report';
import { getSourcePath } from '../helpers/source';
import { getImportResolver } from '../get_import_resolver';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';

export const RequireDynamicImportExtensionRule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsrequire_dynamic_import_extension',
    },
  },

  create(context) {
    const resolver = getImportResolver(context);
    const sourcePath = getSourcePath(context);
    const sourceDirname = Path.dirname(sourcePath);

    return visitAllImportStatements((req, { node, type }) => {
      if (!req || type !== 'dynamic-import') {
        return;
      }

      if (!req.startsWith('./') && !req.startsWith('../')) {
        return;
      }

      if (req.endsWith('.js')) {
        return;
      }

      const result = resolver.resolve(req, sourceDirname);
      if (result?.type !== 'file') {
        return;
      }

      const correct = getRelativeImportReq({
        ...result,
        original: req,
        dirname: sourceDirname,
        sourcePath,
        type,
      });

      if (correct && correct !== req) {
        report(context, {
          node,
          message: `Dynamic import() of relative path must use a .js extension for nodenext compatibility. Use [${correct}]`,
          correctImport: correct,
        });
      }
    });
  },
};
