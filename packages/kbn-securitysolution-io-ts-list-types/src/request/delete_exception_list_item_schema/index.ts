/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { NamespaceType } from '../../common/default_namespace';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { id } from '../../common/id';
import { item_id } from '../../common/item_id';
import { namespace_type } from '../../common/namespace_type';

export const deleteExceptionListItemSchema = t.exact(
  t.partial({
    id,
    item_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type DeleteExceptionListItemSchema = t.OutputOf<typeof deleteExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type DeleteExceptionListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof deleteExceptionListItemSchema>>,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};
