"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createIndexName = void 0;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const createIndexName = function (sampleDataSetId, dataIndexId) {
  // Sample data schema was updated to support multiple indices in 6.5.
  // This if statement ensures that sample data sets that used a single index prior to the schema change
  // have the same index name to avoid orphaned indices when uninstalling.
  if (sampleDataSetId === dataIndexId) {
    return `kibana_sample_data_${sampleDataSetId}`;
  }

  return `kibana_sample_data_${sampleDataSetId}_${dataIndexId}`;
};

exports.createIndexName = createIndexName;