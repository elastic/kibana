/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  RouteValidatorContainer,
  RouteValidatorFullConfig,
  RouteValidatorFullConfigContainer,
} from './route_validator';

type AnyRouteValidator = RouteValidatorContainer<unknown, unknown, unknown>;

/**
 * {@link RouteValidatorContainer} is a union type of all possible ways that validation
 * configuration can be registered. This helper utility narrows down the type
 * by indicating whether it is {@link RouteValidatorFullConfigContainer} or not.
 * @public
 */
export function isFullValidatorContainer(
  value: AnyRouteValidator
): value is RouteValidatorFullConfigContainer<unknown, unknown, unknown> {
  return 'request' in value;
}

/**
 * Extracts {@link RouteValidatorFullConfig} from the validation container.
 * This utility is intended to be used by code introspecting router validation configuration.
 * @public
 */
export function getRequestValidation<P, Q, B>(
  value: RouteValidatorContainer<P, Q, B>
): RouteValidatorFullConfig<P, Q, B> {
  return isFullValidatorContainer(value) ? value.request : value;
}
