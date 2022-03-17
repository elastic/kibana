/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { NamespaceType } from '../../common/default_namespace';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { id } from '../../common/id';
import { filter, Filter } from '../../common/filter';
import { list_id } from '../../common/list_id';
import { namespace_type } from '../../common/namespace_type';

export const summaryExceptionListSchema = t.exact(
  t.partial({
    filter,
    id,
    list_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type SummaryExceptionListSchema = t.OutputOf<typeof summaryExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type SummaryExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof summaryExceptionListSchema>>,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
  filter: Filter;
};
