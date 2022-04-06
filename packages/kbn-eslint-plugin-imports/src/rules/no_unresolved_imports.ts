/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Rule } from 'eslint';

import { resolveKibanaImport } from '../resolve_kibana_import';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';

export const NoUnresolvedImportsRule: Rule.RuleModule = {
  create(context) {
    const sourceFilename = context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename();

    if (!sourceFilename) {
      throw new Error('unable to determine sourceFilename for file being linted');
    }

    return visitAllImportStatements((req, importer) => {
      if (!resolveKibanaImport(req, Path.dirname(sourceFilename))) {
        context.report({
          node: importer as any,
          message: `Unable to resolve import [${req}]`,
        });
      }
    });
  },
};
