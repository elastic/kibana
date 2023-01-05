/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const page = t.number; // TODO: Change this out for PositiveNumber from siem
export type Page = t.TypeOf<typeof page>;

export const pageOrUndefined = t.union([page, t.undefined]);
export type PageOrUndefined = t.TypeOf<typeof pageOrUndefined>;
