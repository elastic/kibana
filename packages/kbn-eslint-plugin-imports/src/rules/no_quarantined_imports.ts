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
import { REPO_ROOT } from '@kbn/repo-info';
import type { QuarantineConfig } from '@kbn/dependency-quarantine';
import {
  formatQuarantineMessage,
  isPathAllowed,
  loadQuarantineConfigs,
  matchQuarantinedPackage,
} from '@kbn/dependency-quarantine';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { report } from '../helpers/report';
import { getSourcePath } from '../helpers/source';

let cachedConfigs: QuarantineConfig[] | undefined;
const getConfigs = (): QuarantineConfig[] => (cachedConfigs ??= loadQuarantineConfigs());

export const NoQuarantinedImportsRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow imports of quarantined dependencies outside their allowlisted files.',
    },
  },

  create(context) {
    const configs = getConfigs();
    const filename = getSourcePath(context);
    const repoRelPath = Path.relative(REPO_ROOT, filename).split(Path.sep).join('/');

    return visitAllImportStatements((req, { node }) => {
      if (!req) {
        return;
      }

      const config = matchQuarantinedPackage(req, configs);
      if (!config) {
        return;
      }

      if (isPathAllowed(repoRelPath, config.allowed)) {
        return;
      }

      report(context, {
        node,
        message: formatQuarantineMessage(config),
      });
    });
  },
};
