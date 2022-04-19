/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Rule } from 'eslint';

import { report } from '../helpers/report';
import { getImportResolver } from '../get_import_resolver';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';

export const NoUnresolvableImportsRule: Rule.RuleModule = {
  create(context) {
    const resolver = getImportResolver(context);

    const sourceFilename = context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename();

    if (!sourceFilename) {
      throw new Error('unable to determine sourceFilename for file being linted');
    }

    return visitAllImportStatements((req, importer) => {
      if (req !== null && !resolver.resolve(req, Path.dirname(sourceFilename))) {
        report(context, {
          node: importer,
          message: `Unable to resolve import [${req}]`,
        });
      }
    });
  },
};
