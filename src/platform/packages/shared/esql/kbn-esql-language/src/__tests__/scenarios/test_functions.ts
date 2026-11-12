/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionDefinition } from '../../commands/definitions/types';
import { FunctionDefinitionTypes } from '../../commands/definitions/types';
import { Location } from '../../commands/registry/types';

const COUNTER_TYPES = ['counter_double', 'counter_integer', 'counter_long'] as const;

/** A time series aggregation over counters, for scenarios that need one to exist. */
export const counterRateTestFunction: FunctionDefinition = {
  type: FunctionDefinitionTypes.TIME_SERIES_AGG,
  name: 'func',
  description: '',
  signatures: COUNTER_TYPES.map((type) => ({
    params: [{ name: 'field', type, optional: false }],
    returnType: 'double',
  })),
  locationsAvailable: [Location.STATS_TIMESERIES],
};
