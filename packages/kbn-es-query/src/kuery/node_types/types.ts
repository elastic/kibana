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

import { JsonValue } from '@kbn/utility-types';
import { KueryNode, KueryQueryOptions } from '..';
import { DataViewBase } from '../..';

export type FunctionName = 'is' | 'and' | 'or' | 'not' | 'range' | 'exists' | 'nested';

interface FunctionType {
  buildNode: (functionName: FunctionName, ...args: any[]) => FunctionTypeBuildNode;
  buildNodeWithArgumentNodes: (functionName: FunctionName, args: any[]) => FunctionTypeBuildNode;
  toElasticsearchQuery: (
    node: any,
    indexPattern?: DataViewBase,
    config?: KueryQueryOptions,
    context?: Record<string, any>
  ) => JsonValue;
}

export interface FunctionTypeBuildNode {
  type: 'function';
  function: FunctionName;
  // TODO -> Need to define a better type for DSL query
  arguments: any[];
}

interface LiteralType {
  buildNode: (value: null | boolean | number | string) => LiteralTypeBuildNode;
  toElasticsearchQuery: (node: any) => null | boolean | number | string;
}

export interface LiteralTypeBuildNode {
  type: 'literal';
  value: null | boolean | number | string;
}

interface WildcardType {
  wildcardSymbol: string;
  buildNode: (value: string) => WildcardTypeBuildNode | KueryNode;
  test: (node: any, string: string) => boolean;
  toElasticsearchQuery: (node: any) => string;
  toQueryStringQuery: (node: any) => string;
  hasLeadingWildcard: (node: any) => boolean;
}

export interface WildcardTypeBuildNode {
  type: 'wildcard';
  value: string;
}

export interface NodeTypes {
  function: FunctionType;
  literal: LiteralType;
  wildcard: WildcardType;
}
