/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Base index representing "today" (current month).
 * Using a high value allows prepending past months without going negative.
 * Negative indices will trigger a Virtuoso console warning.
 */
export const TODAY_INDEX = 100000;

/**
 * Number of months to load initially
 * and when the top or bottom of the calendar scroll is reached.
 */
export const MONTHS_TO_LOAD = 12;
