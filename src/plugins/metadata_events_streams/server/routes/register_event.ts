/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';

import { withApiBaseBath } from '../../common';
import { RouteDependencies } from './types';

export const registerRegisterEventRoute = (
  router: IRouter,
  { metadataEventsStreams }: RouteDependencies
) => {
  router.post(
    {
      path: withApiBaseBath('/{stream}/event'),
      validate: {
        params: schema.object({
          stream: schema.oneOf([schema.literal('user_content')]),
        }),
      },
      // validate: {
      //   query: schema.object({
      //     perPage: schema.number({ min: 0, defaultValue: 20 }),
      //     page: schema.number({ min: 0, defaultValue: 1 }),
      //     type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
      //     search: schema.maybe(schema.string()),
      //     defaultSearchOperator: searchOperatorSchema,
      //     sortField: schema.maybe(schema.string()),
      //     hasReference: schema.maybe(
      //       schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])
      //     ),
      //     hasReferenceOperator: searchOperatorSchema,
      //     fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
      //       defaultValue: [],
      //     }),
      //   }),
      // },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      // const { query, params } = req;

      // console.log('PARAMS', params);

      return res.ok({
        body: 'ok',
      });
    })
  );
};
