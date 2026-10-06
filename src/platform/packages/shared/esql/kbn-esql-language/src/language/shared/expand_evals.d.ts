/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@elastic/esql/types';
/**
 * Expands EVAL commands into separate single-expression EVAL commands.
 *
 * E.g. EVAL foo = 1, bar = 2 => [EVAL foo = 1, EVAL bar = 2]
 *
 * This is logically equivalent and makes validation and field existence detection much easier.
 *
 * @param commands The list of commands to expand.
 * @returns The expanded list of commands.
 */
export declare function expandEvals(commands: ESQLCommand[]): ESQLCommand[];
