/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AddVersionOpts,
  RouteValidationSpec,
  VersionedRouteCustomResponseBodyValidation,
  VersionedResponseBodyValidation,
} from '@kbn/core-http-server';
export declare function isCustomValidation(
  v: VersionedRouteCustomResponseBodyValidation | VersionedResponseBodyValidation
): v is VersionedRouteCustomResponseBodyValidation;
/**
 * Utility for unwrapping versioned router response validation to
 * {@link RouteValidationSpec}.
 *
 * @param validation - versioned response body validation
 * @internal
 */
export declare function unwrapVersionedResponseBodyValidation(
  validation: VersionedResponseBodyValidation
): RouteValidationSpec<unknown>;
export declare function prepareVersionedRouteValidation(
  options: AddVersionOpts<unknown, unknown, unknown>
): AddVersionOpts<unknown, unknown, unknown>;
