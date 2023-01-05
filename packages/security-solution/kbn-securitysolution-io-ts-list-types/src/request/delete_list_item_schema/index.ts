/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { id } from '../../common/id';
import { list_id } from '../../common/list_id';
import { valueOrUndefined } from '../../common/value';

export const deleteListItemSchema = t.intersection([
  t.exact(
    t.type({
      value: valueOrUndefined,
    })
  ),
  t.exact(t.partial({ id, list_id })),
]);

export type DeleteListItemSchema = t.OutputOf<typeof deleteListItemSchema>;
export type DeleteListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof deleteListItemSchema>
>;
