/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import type { Rule } from 'eslint';

import { report } from '../helpers/report';
import { getSourcePath } from '../helpers/source';
import { getImportResolver } from '../get_import_resolver';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';

export const NoUnresolvableImportsRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unresolvable_imports',
    },
  },
  create(context) {
    const resolver = getImportResolver(context);
    const sourcePath = getSourcePath(context);

    return visitAllImportStatements((req, { node }) => {
      if (req !== null && !resolver.resolve(req, Path.dirname(sourcePath))) {
        report(context, {
          node,
          message: `Unable to resolve import [${req}]`,
        });
      }
    });
  },
};
