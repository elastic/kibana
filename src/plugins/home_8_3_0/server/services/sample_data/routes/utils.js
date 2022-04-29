"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSavedObjectsClient = exports.getSampleDataInstaller = void 0;

var _sample_data_installer = require("../sample_data_installer");

var _utils = require("../lib/utils");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const getSampleDataInstaller = async ({
  datasetId,
  context,
  sampleDatasets,
  logger
}) => {
  const core = await context.core;
  const sampleDataset = sampleDatasets.find(({
    id
  }) => id === datasetId);
  const {
    getImporter,
    client: soClient
  } = core.savedObjects;
  const objectTypes = (0, _utils.getUniqueObjectTypes)(sampleDataset.savedObjects);
  const savedObjectsClient = await getSavedObjectsClient(context, objectTypes);
  const soImporter = getImporter(savedObjectsClient);
  return new _sample_data_installer.SampleDataInstaller({
    esClient: core.elasticsearch.client,
    soImporter,
    soClient,
    logger,
    sampleDatasets
  });
};

exports.getSampleDataInstaller = getSampleDataInstaller;

const getSavedObjectsClient = async (context, objectTypes) => {
  const {
    getClient,
    typeRegistry
  } = (await context.core).savedObjects;
  const includedHiddenTypes = objectTypes.filter(supportedType => typeRegistry.isHidden(supportedType));
  return getClient({
    includedHiddenTypes
  });
};

exports.getSavedObjectsClient = getSavedObjectsClient;