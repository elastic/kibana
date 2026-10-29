/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import type { StateComparators } from '@kbn/presentation-publishing';
import type { SerializedDrilldowns } from '../../server';

/** Compares the drilldowns of two serialized states. */
export const drilldownsComparators: StateComparators<SerializedDrilldowns> = {
  drilldowns: (a, b) => deepEqual(a ?? [], b ?? []),
};
