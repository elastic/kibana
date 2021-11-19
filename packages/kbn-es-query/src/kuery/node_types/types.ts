/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KQL_NODE_TYPE_LITERAL } from './literal';
import { KQL_NODE_TYPE_WILDCARD } from './wildcard';
import { KQL_NODE_TYPE_FUNCTION } from './function';

export type KqlNodeType =
  | typeof KQL_NODE_TYPE_FUNCTION
  | typeof KQL_NODE_TYPE_LITERAL
  | typeof KQL_NODE_TYPE_WILDCARD;

export interface KqlNode {
  type: KqlNodeType;
}
