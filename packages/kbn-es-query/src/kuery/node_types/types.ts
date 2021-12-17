/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KQL_NODE_TYPE_LITERAL, KqlLiteralNode } from './literal';
import { KQL_NODE_TYPE_WILDCARD, KqlWildcardNode } from './wildcard';
import { KQL_NODE_TYPE_FUNCTION, KqlFunctionNode } from './function';
import { KQL_NODE_TYPE_SUGGESTION, KqlSuggestionNode } from './suggestion';
import { KQL_NODE_TYPE_REGEXP, KqlRegexpNode } from './regexp';

export type KqlNodeType =
  | typeof KQL_NODE_TYPE_FUNCTION
  | typeof KQL_NODE_TYPE_LITERAL
  | typeof KQL_NODE_TYPE_WILDCARD
  | typeof KQL_NODE_TYPE_SUGGESTION
  | typeof KQL_NODE_TYPE_REGEXP;

/**
 * Generic KQL AST node (extended by the types below)
 */
export interface KqlNode {
  type: KqlNodeType;
}

export type { KqlLiteralNode, KqlWildcardNode, KqlFunctionNode, KqlSuggestionNode, KqlRegexpNode };
