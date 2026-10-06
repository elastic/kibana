/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Upper bound on a duration string. Compound forms like `1w2d3h4m5s6ms` are
 * well under this; the cap is applied before either duration regex, including
 * on values rendered from HITL timeout templates.
 */
export declare const MAX_DURATION_LENGTH = 64;
/**
 * Compound duration with units in descending order (w, d, h, m, s, ms).
 * That order is the validation: `1h30m` matches, `1m1h` does not.
 * `(?=.)` rejects the empty string (every unit group is otherwise optional).
 */
export declare const DURATION_REGEX: RegExp;
/** True when `duration` is a compound duration no longer than {@link MAX_DURATION_LENGTH}. */
export declare function isValidDuration(duration: unknown): duration is string;
/** Throws if `duration` is not a compound duration string. */
export declare function assertValidDuration(duration: unknown): asserts duration is string;
/** Converts a compound duration string to milliseconds. */
export declare function parseDuration(duration: string): number;
