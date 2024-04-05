/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Joi from 'joi';
import joiToJsonParse from 'joi-to-json';
import { postProcessMutations } from './kbn_config_schema';

export const parse = (schema: Joi.Schema) => {
  const result = joiToJsonParse(schema, 'open-api');
  postProcessMutations(result);
  return result;
};
