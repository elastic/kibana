/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Joi from 'joi';
import { Request, ResponseToolkit } from '@hapi/hapi';
import {
  defaultValidationErrorHandler,
  HapiValidationError,
} from './default_validation_error_handler';

const emptyOutput = {
  statusCode: 400,
  headers: {},
  payload: {
    statusCode: 400,
    error: '',
    validation: {
      source: '',
      keys: [],
    },
  },
};

describe('defaultValidationErrorHandler', () => {
  it('formats value validation errors correctly', () => {
    expect.assertions(1);
    const schema = Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
      }).required()
    );

    const error = schema.validate([{}], { abortEarly: false }).error as HapiValidationError;

    // Emulate what Hapi v17 does by default
    error.output = { ...emptyOutput };
    error.output.payload.validation.keys = ['0.type', ''];

    try {
      defaultValidationErrorHandler({} as Request, {} as ResponseToolkit, error);
    } catch (err) {
      // Verify the empty string gets corrected to 'value'
      expect(err.output.payload.validation.keys).toEqual(['0.type', 'value']);
    }
  });
});
