/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This set tracks commands that don't use commas to separate their
 * arguments.
 *
 * Normally ES|QL command arguments are separated by commas.
 *
 * ```
 * COMMAND arg1, arg2, arg3
 * ```
 *
 * But there are some commands (namely `dissect`) which don't
 * use commas to separate their arguments.
 *
 * ```
 * DISSECT input "pattern"
 * GROK input "pattern1", "pattern2", "pattern3"
 * ```
 */
export const commandsWithNoCommaArgSeparator = new Set(['dissect', 'sample', 'fork', 'promql']);

export const commandsWithSpecialCommaRules = new Map<string, (argIndex: number) => boolean>([
  ['grok', (argIndex: number) => argIndex > 1], // Comma before patterns starting from index 2
]);

/**
 * This set tracks command options which use an equals sign to separate
 * the option label from the option value.
 *
 * Most ES|QL commands use a space to separate the option label from the
 * option value.
 *
 * ```
 * COMMAND arg1, arg2, arg3 OPTION option
 * FROM index METADATA _id
 *                    |
 *                    |
 *                    space
 * ```
 *
 * However, the `APPEND_SEPARATOR` in the `DISSECT` command uses an equals
 * sign to separate the option label from the option value.
 *
 * ```
 * DISSECT input "pattern" APPEND_SEPARATOR = "separator"
 *                                          |
 *                                          |
 *                                          equals sign
 * ```
 */
export const commandOptionsWithEqualsSeparator = new Set(['append_separator']);
