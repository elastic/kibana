/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { CreateOnceRule } from '@oxlint/plugins';

import { report } from '../helpers/report';
import { getImportResolver } from '../get_import_resolver';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';

export const NoUnresolvableImportsRule: CreateOnceRule = {
  meta: {
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unresolvable_imports',
    },
  },
  createOnce(context) {
    return visitAllImportStatements(() => {
      const resolver = getImportResolver(context);
      const sourceDirname = Path.dirname(context.physicalFilename);

      return (req, { node }) => {
        if (req !== null && !resolver.resolve(req, sourceDirname)) {
          report(context, {
            node,
            message: `Unable to resolve import [${req}]`,
          });
        }
      };
    });
  },
};
