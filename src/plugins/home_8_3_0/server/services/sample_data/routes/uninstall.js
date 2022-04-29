"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createUninstallRoute = createUninstallRoute;

var _configSchema = require("@kbn/config-schema");

var _utils = require("./utils");

var _errors = require("../errors");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function createUninstallRoute(router, sampleDatasets, logger, usageTracker) {
  router.delete({
    path: '/api/sample_data/{id}',
    validate: {
      params: _configSchema.schema.object({
        id: _configSchema.schema.string()
      })
    }
  }, async (context, request, response) => {
    const sampleDataset = sampleDatasets.find(({
      id
    }) => id === request.params.id);

    if (!sampleDataset) {
      return response.notFound();
    }

    const sampleDataInstaller = await (0, _utils.getSampleDataInstaller)({
      datasetId: sampleDataset.id,
      sampleDatasets,
      logger,
      context
    });

    try {
      await sampleDataInstaller.uninstall(request.params.id); // track the usage operation in a non-blocking way

      usageTracker.addUninstall(request.params.id);
      return response.noContent();
    } catch (e) {
      if (e instanceof _errors.SampleDataInstallError) {
        return response.customError({
          body: {
            message: e.message
          },
          statusCode: e.httpCode
        });
      }

      throw e;
    }
  });
}