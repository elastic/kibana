/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const meta = t.object;
export type Meta = t.TypeOf<typeof meta>;
// TODO: add null in name?
export const metaOrUndefined = t.union([meta, t.undefined, t.null]);
export type MetaOrUndefined = t.TypeOf<typeof metaOrUndefined>;
