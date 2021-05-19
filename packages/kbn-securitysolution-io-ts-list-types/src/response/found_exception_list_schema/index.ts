/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { page } from '../../common/page';
import { per_page } from '../../common/per_page';
import { total } from '../../common/total';

import { exceptionListSchema } from '../exception_list_schema';

export const foundExceptionListSchema = t.exact(
  t.type({
    data: t.array(exceptionListSchema),
    page,
    per_page,
    total,
  })
);

export type FoundExceptionListSchema = t.TypeOf<typeof foundExceptionListSchema>;
