/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { DefaultStringBooleanFalse } from '@kbn/securitysolution-io-ts-types';
import {
  createExceptionListSchema,
  CreateExceptionListSchema,
  CreateExceptionListSchemaDecoded,
} from '../../create_exception_list_schema';

export const internalCreateExceptionListQuerySchema = t.exact(
  t.partial({
    ignore_existing: DefaultStringBooleanFalse,
  })
);

export type InternalCreateExceptionListQuerySchema = t.OutputOf<
  typeof internalCreateExceptionListQuerySchema
>;

export const internalCreateExceptionListSchema = createExceptionListSchema;
export type InternalCreateExceptionListSchema = CreateExceptionListSchema;
export type InternalCreateExceptionListSchemaDecoded = CreateExceptionListSchemaDecoded;
