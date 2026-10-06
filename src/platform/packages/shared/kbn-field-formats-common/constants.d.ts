/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const EMPTY_LABEL: string;
export declare const NULL_LABEL: string;
/**
 * Displayed in place of a null value in tables and Discover, where a tooltip can carry the
 * meaning. Not translated: a dash is locale-independent.
 *
 * Named `NULL_PLACEHOLDER` (rather than `NULL_TOKEN`) to make the distinction from
 * `MISSING_TOKEN` explicit: `MISSING_TOKEN` is an internal sentinel used to mark absent
 * values in aggregation flows, whereas this constant is user-facing UI text.
 */
export declare const NULL_PLACEHOLDER = '-';
export declare const NAN_LABEL = 'NaN';
export declare const MISSING_TOKEN = '__missing__';
