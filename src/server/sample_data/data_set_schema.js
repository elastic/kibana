import Joi from 'joi';

export const dataSetSchema = {
  id: Joi.string().regex(/^[a-zA-Z0-9-]+$/).required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  dataPath: Joi.string().required(), // path to newline delimented JSON file containing data relative to KIBANA_HOME
  fields: Joi.object().required(), // Object defining Elasticsearch field mappings (contents of index.mappings.type.properties)

  // times fields that will be updated relative to now when data is installed
  timeFields: Joi.array().items(Joi.string()).required(),

  // Reference to now in your test data set.
  // When data is installed, timestamps are converted to the present time.
  // The distance between a timestamp and currentTimeMarker is preserved but the date and time will change.
  // For example:
  //   sample data set:    timestamp: 2018-01-01T00:00:00, currentTimeMarker: 2018-01-01T12:00:00
  //   installed data set: timestamp: 2018-04-18T20:33:14, currentTimeMarker: 2018-04-19T08:33:14
  currentTimeMarker: Joi.string().isoDate().required(),
};
