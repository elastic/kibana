/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import { sep } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getComponentCodeowners } from './codeowners/get_component_codeowners';

interface InspectComponentRoutesOptions {
  http: HttpServiceSetup;
  logger: Logger;
}

export const registerInspectComponentRoutes = ({ http, logger }: InspectComponentRoutesOptions) => {
  const router = http.createRouter();

  /**
   * @internal
   * Route to inspect a component at a given path.
   * @returns {Object} Result object
   * @returns {string[]} result.codeowners - List of codeowners for the component
   * @returns {string} result.relativePath - Path relative to the repo root
   * @returns {string} result.baseFileName - Base file name of the component
   */

  router.post(
    {
      path: '/internal/inspect_component/inspect',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      options: {
        access: 'internal',
      },
      validate: {
        body: schema.object({
          path: schema.string({
            minLength: 1,
          }),
        }),
      },
    },
    async (_ctx, req, res) => {
      const { path } = req.body;

      logger.debug(`Inspecting component at path: ${path}`);

      const relativePath = path.slice(REPO_ROOT.length + sep.length);
      const baseFileName = relativePath.split(sep).pop();

      const codeowners = getComponentCodeowners(relativePath);

      return res.ok({ body: { codeowners, relativePath, baseFileName } });
    }
  );
};
