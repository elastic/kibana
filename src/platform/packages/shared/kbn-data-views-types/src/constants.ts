/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * All runtime field types.
 * @public
 */
export const RUNTIME_FIELD_TYPES = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
  'composite',
] as const;

/**
 * UiSettings key for metaFields list.
 * @public
 */
export const META_FIELDS = 'metaFields';

/**
 * Data view saved object type.
 * @public
 */
export const DATA_VIEW_SAVED_OBJECT_TYPE = 'index-pattern';

/**
 * Max length for the custom field description
 */
export const MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH = 300;
