/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PARAMS, type Params } from '@kbn/contrast-roles';

/** Ramp fills are steps of one color rather than roles, so they keep the workbench's taper. */
export const RAMP_PARAMS: Params = {
  ...DEFAULT_PARAMS,
  chroma: { ...DEFAULT_PARAMS.chroma, taper: 0.5 },
};
