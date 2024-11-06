/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { list_id } from '../../common/list_id';
import { value } from '../../common/value';
import { id } from '../../common/id';
import { meta } from '../../common/meta';
import { refreshWithWaitFor } from '../../common/refresh';

export const createListItemSchema = t.intersection([
  t.exact(
    t.type({
      list_id,
      value,
    })
  ),
  t.exact(t.partial({ id, meta, refresh: refreshWithWaitFor })),
]);

export type CreateListItemSchema = t.OutputOf<typeof createListItemSchema>;
export type CreateListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof createListItemSchema>
>;
