/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import type {
  AddVersionOpts,
  RouteValidationSpec,
  VersionedRouteCustomResponseBodyValidation,
  VersionedResponseBodyValidation,
  VersionedRouteResponseValidation,
  VersionedRouteValidation,
} from '@kbn/core-http-server';

export function isCustomValidation(
  v: VersionedRouteCustomResponseBodyValidation | VersionedResponseBodyValidation
): v is VersionedRouteCustomResponseBodyValidation {
  return 'custom' in v;
}

/**
 * Utility for unwrapping versioned router response validation to
 * {@link RouteValidationSpec}.
 *
 * @param validation - versioned response body validation
 * @internal
 */
export function unwrapVersionedResponseBodyValidation(
  validation: VersionedRouteResponseValidation[number]['body']
): RouteValidationSpec<unknown> {
  if (isCustomValidation(validation)) {
    return validation.custom;
  }
  return validation();
}

function prepareValidation(validation: VersionedRouteValidation<unknown, unknown, unknown>) {
  if (validation.response) {
    const { unsafe, ...responseValidations } = validation.response;
    const result: VersionedRouteResponseValidation = {};

    for (const [key, { body }] of Object.entries(responseValidations)) {
      result[key as unknown as number] = { body: isCustomValidation(body) ? body : once(body) };
    }

    return {
      ...validation,
      response: {
        ...validation.response,
        ...result,
      },
    };
  }
  return validation;
}

// Integration tested in ./core_versioned_route.test.ts
export function prepareVersionedRouteValidation(
  options: AddVersionOpts<unknown, unknown, unknown>
): AddVersionOpts<unknown, unknown, unknown> {
  if (typeof options.validate === 'function') {
    const validate = options.validate;
    return {
      ...options,
      validate: once(() => prepareValidation(validate())),
    };
  } else if (typeof options.validate === 'object' && options.validate !== null) {
    return {
      ...options,
      validate: prepareValidation(options.validate),
    };
  }
  return options;
}
