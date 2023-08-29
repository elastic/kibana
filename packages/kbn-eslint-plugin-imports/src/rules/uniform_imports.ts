/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import type { Rule } from 'eslint';
import { getRelativeImportReq, getPackageRelativeImportReq } from '@kbn/import-resolver';

import { report } from '../helpers/report';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { getSourcePath } from '../helpers/source';
import { getImportResolver } from '../get_import_resolver';

export const UniformImportsRule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsuniform_imports',
    },
  },

  create(context) {
    const resolver = getImportResolver(context);
    const sourcePath = getSourcePath(context);
    const sourceDirname = Path.dirname(sourcePath);
    const ownPackageId = resolver.getPackageIdForPath(sourcePath);

    return visitAllImportStatements((req, { node, type }) => {
      if (!req) {
        return;
      }

      const result = resolver.resolve(req, sourceDirname);
      if (result?.type !== 'file' || result.nodeModule) {
        return;
      }

      const { pkgId } = result;

      if (pkgId === ownPackageId || !pkgId) {
        const correct = getRelativeImportReq({
          ...result,
          original: req,
          dirname: sourceDirname,
          sourcePath,
          type,
        });

        if (req !== correct) {
          report(context, {
            node,
            message: `Use import request [${correct}]`,
            correctImport: correct,
          });
        }
        return;
      }

      const packageDir = resolver.getAbsolutePackageDir(pkgId);
      if (!packageDir) {
        report(context, {
          node,
          message: `Unable to determine location of package [${pkgId}]`,
        });
        return;
      }

      const correct = getPackageRelativeImportReq({
        ...result,
        packageDir,
        pkgId,
        type,
      });

      if (req !== correct) {
        report(context, {
          node,
          message: `Use import request [${correct}]`,
          correctImport: correct,
        });
        return;
      }
    });
  },
};
