/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import { AddVersionOpts, VersionedRouteValidation } from '@kbn/core-http-server';

function isStatusCode(key: string) {
  return !isNaN(parseInt(key, 10));
}

export function prepareResponseValidation(
  validation: VersionedRouteValidation<unknown, unknown, unknown>
): VersionedRouteValidation<unknown, unknown, unknown> {
  if (validation.response) {
    const responses = Object.entries(validation.response).map(([key, value]) => {
      if (isStatusCode(key)) {
        return [key, { body: once(value.body) }];
      }
      return [key, value];
    });

    return {
      ...validation,
      response: {
        ...Object.fromEntries(responses),
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
      validate: once(() => prepareResponseValidation(validate())),
    };
  } else if (typeof options.validate === 'object' && options.validate !== null) {
    return {
      ...options,
      validate: prepareResponseValidation(options.validate),
    };
  }
  return options;
}
