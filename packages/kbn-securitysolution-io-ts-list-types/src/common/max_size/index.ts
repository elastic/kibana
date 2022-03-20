/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

export const max_size = PositiveIntegerGreaterThanZero;
export type MaxSize = t.TypeOf<typeof max_size>;

export const maxSizeOrUndefined = t.union([max_size, t.undefined]);
export type MaxSizeOrUndefined = t.TypeOf<typeof maxSizeOrUndefined>;
