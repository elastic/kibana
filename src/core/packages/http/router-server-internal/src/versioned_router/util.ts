/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { validRouteSecurity } from '../security_route_config_validator';

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
  validation: VersionedResponseBodyValidation
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

    for (const [key, value] of Object.entries(responseValidations)) {
      result[key as unknown as number] = {
        ...value,
      };
      if (value.body) {
        result[key as unknown as number].body = isCustomValidation(value.body)
          ? value.body
          : once(value.body);
      }
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
  const { validate: originalValidate, security, ...rest } = options;
  let validate = originalValidate;

  if (typeof originalValidate === 'function') {
    validate = once(() => prepareValidation(originalValidate()));
  } else if (typeof validate === 'object' && validate !== null) {
    validate = prepareValidation(validate);
  }

  return {
    security: validRouteSecurity(security),
    validate,
    ...rest,
  };
}
