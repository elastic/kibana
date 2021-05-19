/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { file, RequiredKeepUndefined } from '../../common';

export const importListItemSchema = t.exact(
  t.type({
    file,
  })
);

export type ImportListItemSchema = RequiredKeepUndefined<t.TypeOf<typeof importListItemSchema>>;
export type ImportListItemSchemaEncoded = t.OutputOf<typeof importListItemSchema>;
