/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These fields are used in Joi meta to capture additional information used
 * by OpenAPI spec generator.
 */
export const META_FIELD_X_OAS_OPTIONAL = 'x-oas-optional' as const;
export const META_FIELD_X_OAS_MIN_LENGTH = 'x-oas-min-length' as const;
export const META_FIELD_X_OAS_MAX_LENGTH = 'x-oas-max-length' as const;
export const META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES =
  'x-oas-get-additional-properties' as const;
export const META_FIELD_X_OAS_DEPRECATED = 'x-oas-deprecated' as const;
export const META_FIELD_X_OAS_ANY = 'x-oas-any-type' as const;
