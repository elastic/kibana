/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Joi from 'joi';

const dataIndexSchema = Joi.object({
  id: Joi.string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .required(),

  // path to newline delimented JSON file containing data relative to KIBANA_HOME
  dataPath: Joi.string().required(),

  // Object defining Elasticsearch field mappings (contents of index.mappings.type.properties)
  fields: Joi.object().required(),

  // times fields that will be updated relative to now when data is installed
  timeFields: Joi.array().items(Joi.string()).required(),

  // Reference to now in your test data set.
  // When data is installed, timestamps are converted to the present time.
  // The distance between a timestamp and currentTimeMarker is preserved but the date and time will change.
  // For example:
  //   sample data set:    timestamp: 2018-01-01T00:00:00Z, currentTimeMarker: 2018-01-01T12:00:00Z
  //   installed data set: timestamp: 2018-04-18T20:33:14Z, currentTimeMarker: 2018-04-19T08:33:14Z
  currentTimeMarker: Joi.string().isoDate().required(),

  // Set to true to move timestamp to current week, preserving day of week and time of day
  // Relative distance from timestamp to currentTimeMarker will not remain the same
  preserveDayOfWeekTimeOfDay: Joi.boolean().default(false),
});

const appLinkSchema = Joi.object({
  path: Joi.string().required(),
  label: Joi.string().required(),
  icon: Joi.string().required(),
});

export const sampleDataSchema = {
  id: Joi.string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  previewImagePath: Joi.string().required(),
  darkPreviewImagePath: Joi.string(),

  // saved object id of main dashboard for sample data set
  overviewDashboard: Joi.string().required(),
  appLinks: Joi.array().items(appLinkSchema).default([]),

  // saved object id of default index-pattern for sample data set
  defaultIndex: Joi.string().required(),

  // Kibana saved objects (index patter, visualizations, dashboard, ...)
  // Should provide a nice demo of Kibana's functionality with the sample data set
  savedObjects: Joi.array().items(Joi.object()).required(),
  dataIndices: Joi.array().items(dataIndexSchema).required(),
};
