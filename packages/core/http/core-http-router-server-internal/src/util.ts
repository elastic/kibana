/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import {
  isFullValidatorContainer,
  type RouteValidatorFullConfigResponse,
  type RouteConfig,
  type RouteMethod,
  type RouteValidator,
} from '@kbn/core-http-server';

function isStatusCode(key: string) {
  return !isNaN(parseInt(key, 10));
}

export function prepareResponseValidation(
  validation: RouteValidatorFullConfigResponse
): RouteValidatorFullConfigResponse {
  const responses = Object.entries(validation).map(([key, value]) => {
    if (isStatusCode(key)) {
      return [key, { ...value, ...(value.body ? { body: once(value.body) } : {}) }];
    }
    return [key, value];
  });

  return Object.fromEntries(responses);
}

function prepareValidation<P, Q, B>(validator: RouteValidator<P, Q, B>) {
  if (isFullValidatorContainer(validator) && validator.response) {
    return {
      ...validator,
      response: prepareResponseValidation(validator.response),
    };
  }
  return validator;
}

// Integration tested in ./routes.test.ts
export function prepareRouteConfigValidation<P, Q, B>(
  config: RouteConfig<P, Q, B, RouteMethod>
): RouteConfig<P, Q, B, RouteMethod> {
  // Calculating schema validation can be expensive so when it is provided lazily
  // we only want to instantiate it once. This also provides idempotency guarantees
  if (typeof config.validate === 'function') {
    const validate = config.validate;
    return {
      ...config,
      validate: once(() => prepareValidation(validate())),
    };
  } else if (typeof config.validate === 'object' && typeof config.validate !== null) {
    return {
      ...config,
      validate: prepareValidation(config.validate),
    };
  }
  return config;
}
