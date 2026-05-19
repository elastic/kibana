/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Parse a timeout value to milliseconds. Supports undefined, a number, an
 * empty string, a string representing a number of minutes eg 1m, or a string
 * representing a number of seconds eg 60. All other values throw an error
 */
export declare function parseTimeoutToMs(seconds: any): number | undefined;
