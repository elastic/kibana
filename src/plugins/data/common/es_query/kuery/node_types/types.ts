/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * WARNING: these typings are incomplete
 */

import { IIndexPattern } from '../../../index_patterns';
import { JsonValue } from '../../../../../kibana_utils/public';
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
