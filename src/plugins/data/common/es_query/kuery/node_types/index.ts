/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as functionType from './function';
import * as literal from './literal';
import * as namedArg from './named_arg';
import * as wildcard from './wildcard';
import { NodeTypes } from './types';

export { NodeTypes };
export { nodeBuilder } from './node_builder';

export const nodeTypes: NodeTypes = {
  // This requires better typing of the different typings and their return types.
  // @ts-ignore
  function: functionType,
  literal,
  namedArg,
  wildcard,
};
