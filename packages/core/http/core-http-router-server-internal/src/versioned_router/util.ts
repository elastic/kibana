/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import type { AddVersionOpts, VersionedRouteValidation } from '@kbn/core-http-server';
import { prepareResponseValidation } from '../util';

function prepareValidation(validation: VersionedRouteValidation<unknown, unknown, unknown>) {
  if (validation.response) {
    return {
      ...validation,
      response: prepareResponseValidation(validation.response),
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
