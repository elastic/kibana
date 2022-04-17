/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import Eslint from 'eslint';
import { REPO_ROOT } from '@kbn/utils';
import { getRelativeImportReq, getPackageRelativeImportReq } from '@kbn/import-resolver';

import { report } from '../helpers/report';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { getImportResolver } from '../get_import_resolver';

// TODO: get rid of all the special cases in here by moving more things to packages

const SETUP_NODE_ENV_DIR = Path.resolve(REPO_ROOT, 'src/setup_node_env');
const PKGJSON_PATH = Path.resolve(REPO_ROOT, 'package.json');
const XPACK_PKGJSON_PATH = Path.resolve(REPO_ROOT, 'x-pack/package.json');
const KBN_PM_SCRIPT = Path.resolve(REPO_ROOT, 'packages/kbn-pm/dist/index.js');

export const UniformImportsRule: Eslint.Rule.RuleModule = {
  meta: {
    fixable: 'code',
  },

  create(context) {
    const resolver = getImportResolver(context);
    const sourceFilename = context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename();

    const sourceDirname = Path.dirname(sourceFilename);

    const ownPackageId = resolver.getPackageIdForPath(sourceFilename);

    return visitAllImportStatements((req, { node, type }) => {
      if (!req) {
        return;
      }

      const result = resolver.resolve(req, sourceDirname);
      if (result?.type !== 'file' || result.nodeModule) {
        return;
      }

      const { absolute } = result;
      // don't mess with imports to the kbn/pm script for now
      if (absolute === KBN_PM_SCRIPT) {
        return;
      }

      const packageId = resolver.getPackageIdForPath(absolute);
      if (ownPackageId && !packageId) {
        // special cases, files that aren't in packages but packages are allowed to import them
        if (
          absolute === PKGJSON_PATH ||
          absolute === XPACK_PKGJSON_PATH ||
          absolute.startsWith(SETUP_NODE_ENV_DIR)
        ) {
          return;
        }

        if (resolver.isBazelPackage(ownPackageId)) {
          report(context, {
            node,
            message: `Package [${ownPackageId}] can only import other packages`,
          });
          return;
        }
      }

      if (packageId === ownPackageId || !packageId) {
        const correct = getRelativeImportReq({
          ...result,
          original: req,
          dirname: sourceDirname,
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

      const packageDir = resolver.getAbsolutePackageDir(packageId);
      if (!packageDir) {
        report(context, {
          node,
          message: `Unable to determine location of package [${packageId}]`,
        });
        return;
      }

      const correct = getPackageRelativeImportReq({
        ...result,
        packageDir,
        packageId,
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
