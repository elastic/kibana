/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DESCRIPTION,
  ENDPOINT_TYPE,
  LIST_ID,
  META,
  NAME,
  NAMESPACE_TYPE,
  VERSION,
} from '../../constants/index.mock';

import { CreateExceptionListSchema } from '.';

export const getCreateExceptionListSchemaMock = (): CreateExceptionListSchema => ({
  description: DESCRIPTION,
  list_id: undefined,
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  os_types: [],
  tags: [],
  type: ENDPOINT_TYPE,
  version: VERSION,
});

/**
 * Useful for end to end testing
 */
export const getCreateExceptionListMinimalSchemaMock = (): CreateExceptionListSchema => ({
  description: DESCRIPTION,
  list_id: LIST_ID,
  name: NAME,
  type: ENDPOINT_TYPE,
});

/**
 * Useful for end to end testing
 */
export const getCreateExceptionListMinimalSchemaMockWithoutId = (): CreateExceptionListSchema => ({
  description: DESCRIPTION,
  name: NAME,
  type: ENDPOINT_TYPE,
});

/**
 * Useful for end to end testing with detections
 */
export const getCreateExceptionListDetectionSchemaMock = (): CreateExceptionListSchema => ({
  description: DESCRIPTION,
  list_id: LIST_ID,
  name: NAME,
  type: 'detection',
});
