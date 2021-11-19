/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as functionType from './function';
import * as literal from './literal';
import * as wildcard from './wildcard';
import { KQL_NODE_TYPE_FUNCTION } from './function';
import { KQL_NODE_TYPE_LITERAL } from './literal';
import { KQL_NODE_TYPE_WILDCARD } from './wildcard';

export { nodeBuilder } from './node_builder';

/**
 * @public
 */
export const nodeTypes = {
  [KQL_NODE_TYPE_FUNCTION]: functionType,
  [KQL_NODE_TYPE_LITERAL]: literal,
  [KQL_NODE_TYPE_WILDCARD]: wildcard,
};
