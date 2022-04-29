"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleDataSchema = void 0;

var _configSchema = require("@kbn/config-schema");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const idRegExp = /^[a-zA-Z0-9-]+$/;

const dataIndexSchema = _configSchema.schema.object({
  id: _configSchema.schema.string({
    validate(value) {
      if (!idRegExp.test(value)) {
        return `Does not satisfy regexp: ${idRegExp.toString()}`;
      }
    }

  }),
  // path to newline delimented JSON file containing data relative to KIBANA_HOME
  dataPath: _configSchema.schema.string(),
  // Object defining Elasticsearch field mappings (contents of index.mappings.type.properties)
  fields: _configSchema.schema.recordOf(_configSchema.schema.string(), _configSchema.schema.any()),
  // times fields that will be updated relative to now when data is installed
  timeFields: _configSchema.schema.arrayOf(_configSchema.schema.string()),
  // Reference to now in your test data set.
  // When data is installed, timestamps are converted to the present time.
  // The distance between a timestamp and currentTimeMarker is preserved but the date and time will change.
  // For example:
  //   sample data set:    timestamp: 2018-01-01T00:00:00Z, currentTimeMarker: 2018-01-01T12:00:00Z
  //   installed data set: timestamp: 2018-04-18T20:33:14Z, currentTimeMarker: 2018-04-19T08:33:14Z
  currentTimeMarker: _configSchema.schema.string({
    validate(value) {
      if (isNaN(Date.parse(value))) {
        return 'Expected a valid string in iso format';
      }
    }

  }),
  // Set to true to move timestamp to current week, preserving day of week and time of day
  // Relative distance from timestamp to currentTimeMarker will not remain the same
  preserveDayOfWeekTimeOfDay: _configSchema.schema.boolean({
    defaultValue: false
  })
});

const sampleDataSchema = _configSchema.schema.object({
  id: _configSchema.schema.string({
    validate(value) {
      if (!idRegExp.test(value)) {
        return `Does not satisfy regexp: ${idRegExp.toString()}`;
      }
    }

  }),
  name: _configSchema.schema.string(),
  description: _configSchema.schema.string(),
  previewImagePath: _configSchema.schema.string(),
  darkPreviewImagePath: _configSchema.schema.maybe(_configSchema.schema.string()),
  iconPath: _configSchema.schema.maybe(_configSchema.schema.string()),
  // relative path to icon. Used for display in the Fleet-integrations app
  // saved object id of main dashboard for sample data set
  overviewDashboard: _configSchema.schema.string(),
  // saved object id of default index-pattern for sample data set
  defaultIndex: _configSchema.schema.string(),
  // Kibana saved objects (index patter, visualizations, dashboard, ...)
  // Should provide a nice demo of Kibana's functionality with the sample data set
  savedObjects: _configSchema.schema.arrayOf(_configSchema.schema.object({
    id: _configSchema.schema.string(),
    type: _configSchema.schema.string(),
    attributes: _configSchema.schema.any(),
    references: _configSchema.schema.arrayOf(_configSchema.schema.any()),
    version: _configSchema.schema.maybe(_configSchema.schema.any())
  }, {
    unknowns: 'allow'
  })),
  dataIndices: _configSchema.schema.arrayOf(dataIndexSchema),
  status: _configSchema.schema.maybe(_configSchema.schema.string()),
  statusMsg: _configSchema.schema.maybe(_configSchema.schema.string())
});

exports.sampleDataSchema = sampleDataSchema;