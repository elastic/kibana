/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

export const per_page = t.number; // TODO: Change this out for PositiveNumber from siem
export type PerPage = t.TypeOf<typeof per_page>;

export const perPageOrUndefined = t.union([per_page, t.undefined]);
export type PerPageOrUndefined = t.TypeOf<typeof perPageOrUndefined>;
