import Joi from 'joi';

export const dataSetSchema = {
  id: Joi.string().regex(/^[a-zA-Z0-9-]+$/).required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  previewImagePath: Joi.string().required(),
  overviewDashboard: Joi.string().required(), // saved object id of main dashboard for sample data set
  defaultIndex: Joi.string().required(), // saved object id of default index-pattern for sample data set
  dataPath: Joi.string().required(), // path to newline delimented JSON file containing data relative to KIBANA_HOME
  fields: Joi.object().required(), // Object defining Elasticsearch field mappings (contents of index.mappings.type.properties)

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

  // Kibana saved objects (index patter, visualizations, dashboard, ...)
  // Should provide a nice demo of Kibana's functionallity with the sample data set
  savedObjects: Joi.array().items(Joi.object()).required(),
};
