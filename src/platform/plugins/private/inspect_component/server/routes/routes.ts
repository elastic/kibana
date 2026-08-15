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
import { handleCommitProp, commitPropBodySchema } from './commit_prop';
import { handleDocgen, docgenQuerySchema } from './docgen';

/**
 * Options for {@link registerInspectComponentRoutes}.
 */
interface InspectComponentRoutesOptions {
  /** {@link HttpServiceSetup} */
  httpService: HttpServiceSetup;
  /** {@link Logger} */
  logger: Logger;
}

const AUTH_OPT_OUT = {
  security: {
    authz: {
      enabled: false as const,
      reason: 'This route is opted out from authorization',
    },
  },
  options: {
    access: 'internal' as const,
  },
};

/**
 * Register routes for the Inspect Component plugin.
 */
export const registerInspectComponentRoutes = ({
  httpService,
  logger,
}: InspectComponentRoutesOptions) => {
  const router = httpService.createRouter();

  router.post(
    {
      path: '/internal/inspect_component/inspect',
      ...AUTH_OPT_OUT,
      validate: {
        body: getComponentDataBodySchema,
      },
    },
    async (_ctx, req, res) => getComponentData({ req, res, logger })
  );

  router.post(
    {
      path: '/internal/inspect_component/commit_prop',
      ...AUTH_OPT_OUT,
      validate: {
        body: commitPropBodySchema,
      },
    },
    async (_ctx, req, res) => handleCommitProp({ req, res, logger })
  );

  router.get(
    {
      path: '/internal/inspect_component/docgen',
      ...AUTH_OPT_OUT,
      validate: {
        query: docgenQuerySchema,
      },
    },
    (_ctx, req, res) => handleDocgen({ req, res, logger })
  );
};
