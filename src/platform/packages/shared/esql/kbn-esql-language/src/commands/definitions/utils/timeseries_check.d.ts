/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstCommand } from '@elastic/esql/types';
/**
 * Checks if the source command in the AST is a timeseries command (e.g. TS).
 * Finds the source command dynamically rather than assuming it's at index 0.
 */
export declare const isTimeseriesSourceCommand: (ast: ESQLAstCommand[]) => boolean;
