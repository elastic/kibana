import Joi from 'joi';

export const dataSetSchema = {
  id: Joi.string().regex(/^[a-zA-Z0-9-]+$/).required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  dataPath: Joi.string().required(), // path to newline delimented JSON file containing data relative to KIBANA_HOME
};
