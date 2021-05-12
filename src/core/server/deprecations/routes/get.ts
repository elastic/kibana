/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IRouter } from '../../http';
import { GetDeprecationsContext, DeprecationsGetResponse } from '../types';
import { DeprecationsFactory } from '../deprecations_factory';

interface RouteDependencies {
  deprecationsFactory: DeprecationsFactory;
}

export const registerGetRoute = (router: IRouter, { deprecationsFactory }: RouteDependencies) => {
  router.get(
    {
      path: '/',
      validate: false,
    },
    async (context, req, res) => {
      const dependencies: GetDeprecationsContext = {
        esClient: context.core.elasticsearch.client,
        savedObjectsClient: context.core.savedObjects.client,
      };

      const body: DeprecationsGetResponse = {
        deprecations: await deprecationsFactory.getAllDeprecations(dependencies),
      };

      return res.ok({ body });
    }
  );
};
