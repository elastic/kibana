/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { PositiveIntegerGreaterThanZero } from '../positive_integer_greater_than_zero';

export const max_signals = PositiveIntegerGreaterThanZero;
export type MaxSignals = t.TypeOf<typeof max_signals>;
