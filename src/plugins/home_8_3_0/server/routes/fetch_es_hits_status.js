/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.registerHitsStatusRoute = void 0;

const _configSchema = require('@kbn/config-schema');

const registerHitsStatusRoute = (router) => {
  router.post(
    {
      path: '/api/home/hits_status',
      validate: {
        body: _configSchema.schema.object({
          index: _configSchema.schema.string(),
          query: _configSchema.schema.recordOf(
            _configSchema.schema.string(),
            _configSchema.schema.any()
          ),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { index, query } = req.body;
      const client = (await context.core).elasticsearch.client;

      try {
        const body = await client.asCurrentUser.search({
          index,
          size: 1,
          body: {
            query,
          },
        });
        const count = body.hits.hits.length;
        return res.ok({
          body: {
            count,
          },
        });
      } catch (e) {
        return res.badRequest({
          body: e,
        });
      }
    })
  );
};

exports.registerHitsStatusRoute = registerHitsStatusRoute;
