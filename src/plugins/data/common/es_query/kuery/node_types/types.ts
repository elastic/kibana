/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * WARNING: these typings are incomplete
 */

import { IIndexPattern } from '../../../index_patterns';
import { JsonValue } from '../../../../../kibana_utils/common';
import { KueryNode } from '..';

export type FunctionName =
  | 'is'
  | 'and'
  | 'or'
  | 'not'
  | 'range'
  | 'exists'
  | 'geoBoundingBox'
  | 'geoPolygon'
  | 'nested';

interface FunctionType {
  buildNode: (functionName: FunctionName, ...args: any[]) => FunctionTypeBuildNode;
  buildNodeWithArgumentNodes: (functionName: FunctionName, args: any[]) => FunctionTypeBuildNode;
  toElasticsearchQuery: (
    node: any,
    indexPattern?: IIndexPattern,
    config?: Record<string, any>,
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

interface NamedArgType {
  buildNode: (name: string, value: any) => NamedArgTypeBuildNode;
  toElasticsearchQuery: (node: any) => JsonValue;
}

export interface NamedArgTypeBuildNode {
  type: 'namedArg';
  name: string;
  value: any;
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
  namedArg: NamedArgType;
  wildcard: WildcardType;
}
