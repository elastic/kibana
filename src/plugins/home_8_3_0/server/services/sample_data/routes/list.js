"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createListRoute = void 0;

var _create_index_name = require("../lib/create_index_name");

var _find_sample_objects = require("../lib/find_sample_objects");

var _utils = require("../lib/utils");

var _utils2 = require("./utils");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const NOT_INSTALLED = 'not_installed';
const INSTALLED = 'installed';
const UNKNOWN = 'unknown';

const createListRoute = (router, sampleDatasets, appLinksMap, logger) => {
  router.get({
    path: '/api/sample_data',
    validate: false
  }, async (context, _req, res) => {
    const allExistingObjects = await findExistingSampleObjects(context, logger, sampleDatasets);
    const registeredSampleDatasets = await Promise.all(sampleDatasets.map(async sampleDataset => {
      var _appLinksMap$get;

      const existingObjects = allExistingObjects.get(sampleDataset.id);

      const findObjectId = (type, id) => {
        var _existingObjects$find, _existingObjects$find2;

        return (_existingObjects$find = (_existingObjects$find2 = existingObjects.find(object => object.type === type && object.id === id)) === null || _existingObjects$find2 === void 0 ? void 0 : _existingObjects$find2.foundObjectId) !== null && _existingObjects$find !== void 0 ? _existingObjects$find : id;
      };

      const appLinks = ((_appLinksMap$get = appLinksMap.get(sampleDataset.id)) !== null && _appLinksMap$get !== void 0 ? _appLinksMap$get : []).map(data => {
        const {
          sampleObject,
          getPath,
          label,
          icon
        } = data;

        if (sampleObject === null) {
          return {
            path: getPath(''),
            label,
            icon
          };
        }

        const objectId = findObjectId(sampleObject.type, sampleObject.id);
        return {
          path: getPath(objectId),
          label,
          icon
        };
      });
      const sampleDataStatus = await getSampleDatasetStatus(context, allExistingObjects, sampleDataset);
      return {
        id: sampleDataset.id,
        name: sampleDataset.name,
        description: sampleDataset.description,
        previewImagePath: sampleDataset.previewImagePath,
        darkPreviewImagePath: sampleDataset.darkPreviewImagePath,
        overviewDashboard: findObjectId('dashboard', sampleDataset.overviewDashboard),
        appLinks,
        defaultIndex: findObjectId('index-pattern', sampleDataset.defaultIndex),
        dataIndices: sampleDataset.dataIndices.map(({
          id
        }) => ({
          id
        })),
        ...sampleDataStatus
      };
    }));
    return res.ok({
      body: registeredSampleDatasets
    });
  });
};

exports.createListRoute = createListRoute;

async function findExistingSampleObjects(context, logger, sampleDatasets) {
  const objects = sampleDatasets.map(({
    savedObjects
  }) => savedObjects.map(({
    type,
    id
  }) => ({
    type,
    id
  }))).flat();
  const objectTypes = (0, _utils.getUniqueObjectTypes)(objects);
  const client = await (0, _utils2.getSavedObjectsClient)(context, objectTypes);
  const findSampleObjectsResult = await (0, _find_sample_objects.findSampleObjects)({
    client,
    logger,
    objects
  });
  let objectCounter = 0;
  return sampleDatasets.reduce((acc, {
    id,
    savedObjects
  }) => {
    const datasetResults = savedObjects.map(() => findSampleObjectsResult[objectCounter++]);
    return acc.set(id, datasetResults);
  }, new Map());
} // TODO: introduce PARTIALLY_INSTALLED status (#116677)


async function getSampleDatasetStatus(context, existingSampleObjects, sampleDataset) {
  const dashboard = existingSampleObjects.get(sampleDataset.id).find(({
    type,
    id
  }) => type === 'dashboard' && id === sampleDataset.overviewDashboard);

  if (!(dashboard !== null && dashboard !== void 0 && dashboard.foundObjectId)) {
    return {
      status: NOT_INSTALLED
    };
  }

  const {
    elasticsearch
  } = await context.core;

  for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
    const dataIndexConfig = sampleDataset.dataIndices[i];
    const index = (0, _create_index_name.createIndexName)(sampleDataset.id, dataIndexConfig.id);

    try {
      const indexExists = await elasticsearch.client.asCurrentUser.indices.exists({
        index
      });

      if (!indexExists) {
        return {
          status: NOT_INSTALLED
        };
      }

      const count = await elasticsearch.client.asCurrentUser.count({
        index
      });

      if (count.count === 0) {
        return {
          status: NOT_INSTALLED
        };
      }
    } catch (err) {
      return {
        status: UNKNOWN,
        statusMsg: err.message
      };
    }
  }

  return {
    status: INSTALLED
  };
}