/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { RouteValidator } from './route_validator';
import { getRequestValidation, isFullValidatorContainer } from './utils';

type Validator = RouteValidator<unknown, unknown, unknown>;

describe('isFullValidatorContainer', () => {
  it('correctly identifies RouteValidatorRequestAndResponses', () => {
    const fullValidatorContainer: Validator = {
      request: {
        body: {} as ObjectType,
      },
      response: {},
    };

    expect(isFullValidatorContainer(fullValidatorContainer)).toBe(true);
    expect(isFullValidatorContainer({})).toBe(false);
  });
});

describe('getRequestValidation', () => {
  it('correctly extracts validation config', () => {
    const validationDummy = {
      body: {} as unknown as ObjectType,
    };
    const fullValidatorContainer: Validator = {
      request: validationDummy,
      response: {},
    };
    const fullValidator: Validator = validationDummy;

    expect(getRequestValidation(fullValidatorContainer)).toBe(validationDummy);
    expect(getRequestValidation(fullValidator)).toBe(validationDummy);
  });
});
