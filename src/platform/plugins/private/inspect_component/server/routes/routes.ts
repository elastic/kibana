/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import { getComponentData, getComponentDataBodySchema } from './component_data/get_component_data';

/**
 * Options for {@link registerInspectComponentRoutes}.
 */
interface InspectComponentRoutesOptions {
  /** The HTTP service setup contract. */
  httpService: HttpServiceSetup;
  /** The logger instance. */
  logger: Logger;
}

/**
 * Register routes for the Inspect Component plugin.
 * @param {InspectComponentRoutesOptions} options
 * @param {http} options.httpService The HTTP service setup contract.
 * @param {Logger} options.logger The logger instance.
 */
export const registerInspectComponentRoutes = ({
  httpService,
  logger,
}: InspectComponentRoutesOptions) => {
  const router = httpService.createRouter();

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
        body: getComponentDataBodySchema,
      },
    },
    async (_ctx, req, res) => getComponentData({ req, res, logger })
  );
};
