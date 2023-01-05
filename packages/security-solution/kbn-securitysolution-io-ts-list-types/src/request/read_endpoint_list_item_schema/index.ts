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
import { item_id } from '../../common/item_id';

export const readEndpointListItemSchema = t.exact(
  t.partial({
    id,
    item_id,
  })
);

export type ReadEndpointListItemSchema = t.OutputOf<typeof readEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type ReadEndpointListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof readEndpointListItemSchema>
>;
