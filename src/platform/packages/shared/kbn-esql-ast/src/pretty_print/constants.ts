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
 * But there are some commands (namely `grok` and `dissect`) which don't
 * use commas to separate their arguments.
 *
 * ```
 * GROK input "pattern"
 * DISSECT input "pattern"
 * ```
 */
export const commandsWithNoCommaArgSeparator = new Set(['grok', 'dissect']);

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
