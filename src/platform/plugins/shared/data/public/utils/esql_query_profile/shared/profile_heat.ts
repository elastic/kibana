/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** From this share of a whole, a part of the profile is flagged as warm. */
const WARM_SHARE = 0.25;

/** From this share of a whole, a part of the profile is flagged as hot. */
const HOT_SHARE = 0.5;

export type HeatLevel = 'hot' | 'warm' | 'cool';

/** How much attention a part of the profile deserves, from its share of a whole. */
export const heatLevel = (share: number): HeatLevel =>
  share >= HOT_SHARE ? 'hot' : share >= WARM_SHARE ? 'warm' : 'cool';
