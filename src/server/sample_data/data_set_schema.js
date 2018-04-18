import Joi from 'joi';

export const dataSetSchema = {
  id: Joi.string().regex(/^[a-zA-Z0-9-]+$/).required(),
};
