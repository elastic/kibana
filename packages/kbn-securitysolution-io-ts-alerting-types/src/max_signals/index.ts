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
import { PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';

export const max_signals = PositiveIntegerGreaterThanZero;
export type MaxSignals = t.TypeOf<typeof max_signals>;

export const maxSignalsOrUndefined = t.union([max_signals, t.undefined]);
export type MaxSignalsOrUndefined = t.TypeOf<typeof maxSignalsOrUndefined>;
