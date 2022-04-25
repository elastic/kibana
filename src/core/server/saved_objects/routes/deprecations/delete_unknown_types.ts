/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '../../../http';
import { catchAndReturnBoomErrors } from '../utils';
import { deleteUnknownTypeObjects } from '../../deprecations';

interface RouteDependencies {
  kibanaIndex: string;
  kibanaVersion: string;
}

export const registerDeleteUnknownTypesRoute = (
  router: IRouter,
  { kibanaIndex, kibanaVersion }: RouteDependencies
) => {
  router.post(
    {
      path: '/deprecations/_delete_unknown_types',
      validate: false,
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const { elasticsearch, savedObjects } = await context.core;
      await deleteUnknownTypeObjects({
        esClient: elasticsearch.client,
        typeRegistry: savedObjects.typeRegistry,
        kibanaIndex,
        kibanaVersion,
      });
      return res.ok({
        body: {
          success: true,
        },
      });
    })
  );
};
