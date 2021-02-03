/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { NodeTypes } from './node_types';

export interface KueryNode {
  type: keyof NodeTypes;
  [key: string]: any;
}

export type DslQuery = any;

export interface KueryParseOptions {
  helpers: {
    [key: string]: any;
  };
  startRule: string;
  allowLeadingWildcards: boolean;
  errorOnLuceneSyntax: boolean;
  cursorSymbol?: string;
  parseCursor?: boolean;
}

export { nodeTypes } from './node_types';
