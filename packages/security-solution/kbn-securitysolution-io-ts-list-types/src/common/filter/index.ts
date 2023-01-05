/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const filter = t.string;
export type Filter = t.TypeOf<typeof filter>;
export const filterOrUndefined = t.union([filter, t.undefined]);
export type FilterOrUndefined = t.TypeOf<typeof filterOrUndefined>;
