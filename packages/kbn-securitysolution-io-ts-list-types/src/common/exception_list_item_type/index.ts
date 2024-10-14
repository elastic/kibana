/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

export const exceptionListItemType = t.keyof({ simple: null });
export const exceptionListItemTypeOrUndefined = t.union([exceptionListItemType, t.undefined]);
export type ExceptionListItemType = t.TypeOf<typeof exceptionListItemType>;
export type ExceptionListItemTypeOrUndefined = t.TypeOf<typeof exceptionListItemTypeOrUndefined>;
