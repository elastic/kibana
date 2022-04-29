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
exports.createInstallRoute = createInstallRoute;

const _configSchema = require('@kbn/config-schema');

const _utils = require('./utils');

const _errors = require('../errors');

function createInstallRoute(router, sampleDatasets, logger, usageTracker) {
  router.post(
    {
      path: '/api/sample_data/{id}',
      validate: {
        params: _configSchema.schema.object({
          id: _configSchema.schema.string(),
        }),
        // TODO validate now as date
        query: _configSchema.schema.object({
          now: _configSchema.schema.maybe(_configSchema.schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const { params, query } = req;
      const sampleDataset = sampleDatasets.find(({ id }) => id === params.id);

      if (!sampleDataset) {
        return res.notFound();
      } //  @ts-ignore Custom query validation used

      const now = query.now ? new Date(query.now) : new Date();
      const sampleDataInstaller = await (0, _utils.getSampleDataInstaller)({
        datasetId: sampleDataset.id,
        sampleDatasets,
        logger,
        context,
      });

      try {
        const installResult = await sampleDataInstaller.install(params.id, now); // track the usage operation in a non-blocking way

        usageTracker.addInstall(params.id);
        return res.ok({
          body: {
            elasticsearchIndicesCreated: installResult.createdDocsPerIndex,
            kibanaSavedObjectsLoaded: installResult.createdSavedObjects,
          },
        });
      } catch (e) {
        if (e instanceof _errors.SampleDataInstallError) {
          return res.customError({
            body: {
              message: e.message,
            },
            statusCode: e.httpCode,
          });
        }

        throw e;
      }
    }
  );
}
