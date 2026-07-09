/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Target bucket count for Lens form-based → ES|QL conversion when the date histogram uses
 * `auto` interval: the generated query uses `BUCKET(field, N, ?_tstart, ?_tend)`, and
 * `generate_esql_query.ts` uses the same N with `calculateAuto.near` so the inferred interval
 * matches the bucket width implied by that `BUCKET` call.
 *
 * `N` is 75, not `histogram:barTarget` (default 50), so ES|QL `BUCKET` and the client-side
 * interval match Lens's form-based `auto` date_histogram; the default 50 would not.
 */
export const AUTO_TARGET_NUMBER_OF_BUCKETS = 75;
