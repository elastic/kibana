/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Writable } from '@kbn/utility-types';
import { schema, TypeOf } from '@kbn/config-schema';

const idRegExp = /^[a-zA-Z0-9-]+$/;
const dataIndexSchema = schema.object({
  id: schema.string({
    validate(value: string) {
      if (!idRegExp.test(value)) {
        return `Does not satisfy regexp: ${idRegExp.toString()}`;
      }
    },
  }),

  // path to newline delimented JSON file containing data relative to KIBANA_HOME
  dataPath: schema.string(),

  // Object defining Elasticsearch field mappings (contents of index.mappings.type.properties)
  fields: schema.recordOf(schema.string(), schema.any()),

  // times fields that will be updated relative to now when data is installed
  timeFields: schema.arrayOf(schema.string()),

  // Reference to now in your test data set.
  // When data is installed, timestamps are converted to the present time.
  // The distance between a timestamp and currentTimeMarker is preserved but the date and time will change.
  // For example:
  //   sample data set:    timestamp: 2018-01-01T00:00:00Z, currentTimeMarker: 2018-01-01T12:00:00Z
  //   installed data set: timestamp: 2018-04-18T20:33:14Z, currentTimeMarker: 2018-04-19T08:33:14Z
  currentTimeMarker: schema.string({
    validate(value: string) {
      if (isNaN(Date.parse(value))) {
        return 'Expected a valid string in iso format';
      }
    },
  }),

  // Set to true to move timestamp to current week, preserving day of week and time of day
  // Relative distance from timestamp to currentTimeMarker will not remain the same
  preserveDayOfWeekTimeOfDay: schema.boolean({ defaultValue: false }),
});

export type DataIndexSchema = TypeOf<typeof dataIndexSchema>;

export const sampleDataSchema = schema.object({
  id: schema.string({
    validate(value: string) {
      if (!idRegExp.test(value)) {
        return `Does not satisfy regexp: ${idRegExp.toString()}`;
      }
    },
  }),
  name: schema.string(),
  description: schema.string(),
  previewImagePath: schema.string(),
  darkPreviewImagePath: schema.maybe(schema.string()),
  iconPath: schema.maybe(schema.string()), // relative path to icon. Used for display in the Fleet-integrations app

  // saved object id of main dashboard for sample data set
  overviewDashboard: schema.string(),

  // saved object id of default index-pattern for sample data set
  defaultIndex: schema.string(),

  // Kibana saved objects (index patter, visualizations, dashboard, ...)
  // Should provide a nice demo of Kibana's functionality with the sample data set
  savedObjects: schema.arrayOf(
    schema.object(
      {
        id: schema.string(),
        type: schema.string(),
        attributes: schema.any(),
        references: schema.arrayOf(schema.any()),
        version: schema.maybe(schema.any()),
      },
      { unknowns: 'allow' }
    )
  ),
  dataIndices: schema.arrayOf(dataIndexSchema),

  status: schema.maybe(schema.string()),
  statusMsg: schema.maybe(schema.string()),
});

export type SampleDatasetSchema = Writable<TypeOf<typeof sampleDataSchema>>;
