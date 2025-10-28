/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @packageDocumentation
 * @module @kbn/esql-composer
 *
 * This package contains the primary ESQL composer for building queries
 * in a functional, chainable way. Each exported function represents a command
 * in an ESQL query pipeline.
 */

export { from, timeseries } from './src/commands/from';
export { drop } from './src/commands/drop';
export { evaluate } from './src/commands/eval';
export { keep } from './src/commands/keep';
export { where } from './src/commands/where';
export { stats } from './src/commands/stats';
export { limit } from './src/commands/limit';
export { rename } from './src/commands/rename';
export { sort, SortOrder } from './src/commands/sort';
export { replaceParameters } from './src/pipeline/replace_parameters';

export type { QueryOperator } from './src/types';
