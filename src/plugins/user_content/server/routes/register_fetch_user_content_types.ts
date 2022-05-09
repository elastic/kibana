/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core/server';

import { withApiBaseBath } from '../../common';
import type { RouteDependencies } from './types';

export const registerFetchUserContentTypes = (
  router: IRouter,
  { userContentService }: RouteDependencies
) => {
  router.get(
    {
      path: withApiBaseBath('/user_content_types'),
      validate: false,
    },
    router.handleLegacyErrors(async (context, req, res) => {
      return res.ok({
        body: userContentService.userContentTypes,
      });
    })
  );
};
