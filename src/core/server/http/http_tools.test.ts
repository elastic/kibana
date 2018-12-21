/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Request, ResponseToolkit } from 'hapi';
import Joi from 'joi';
import { defaultValidationErrorHandler, HapiValidationError } from './http_tools';

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
