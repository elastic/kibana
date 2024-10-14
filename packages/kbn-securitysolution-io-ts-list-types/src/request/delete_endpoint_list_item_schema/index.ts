/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { id } from '../../common/id';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { item_id } from '../../common/item_id';

export const deleteEndpointListItemSchema = t.exact(
  t.partial({
    id,
    item_id,
  })
);

export type DeleteEndpointListItemSchema = t.OutputOf<typeof deleteEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type DeleteEndpointListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof deleteEndpointListItemSchema>
>;
