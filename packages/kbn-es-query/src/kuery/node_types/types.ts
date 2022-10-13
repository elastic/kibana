/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * WARNING: these typings are incomplete
 */

export type FunctionName = 'is' | 'and' | 'or' | 'not' | 'range' | 'exists' | 'nested';

export interface FunctionTypeBuildNode {
  type: 'function';
  function: FunctionName;
  // TODO -> Need to define a better type for DSL query
  arguments: any[];
}
