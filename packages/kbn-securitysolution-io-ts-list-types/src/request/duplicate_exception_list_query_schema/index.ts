/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { includeExpiredExceptionsOrUndefined } from '../../common/include_expired_exceptions';
import { list_id } from '../../common/list_id';
import { namespace_type } from '../../common/namespace_type';

export const duplicateExceptionListQuerySchema = t.exact(
  t.type({
    list_id,
    namespace_type,
    include_expired_exceptions: includeExpiredExceptionsOrUndefined,
  })
);

export type DuplicateExceptionListQuerySchema = t.OutputOf<
  typeof duplicateExceptionListQuerySchema
>;
