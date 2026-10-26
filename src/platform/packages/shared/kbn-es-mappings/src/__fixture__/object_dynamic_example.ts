/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as mappings from '../mappings';

export const objectMappingWithStrictDynamic = mappings.object({
  dynamic: 'strict',
  properties: {
    field: mappings.keyword(),
  },
});

export const objectMappingWithFalseDynamic = mappings.object({
  dynamic: false,
  properties: {},
});

export const objectMappingWithMissingDynamic = mappings.object({
  properties: {},
});

export const objectMappingWithTrueDynamic = mappings.object({
  // @ts-expect-error - true is not an allowed object dynamic value
  dynamic: true,
  properties: {},
});

export const objectMappingWithRuntimeDynamic = mappings.object({
  // @ts-expect-error - runtime is not an allowed object dynamic value
  dynamic: 'runtime',
  properties: {},
});
