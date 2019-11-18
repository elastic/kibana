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

import { JsonObject } from '..';

/**
 * WARNING: these typings are incomplete
 */

export type KueryNode = any;

export type DslQuery = any;

export interface KueryParseOptions {
  helpers: {
    [key: string]: any;
  };
  startRule: string;
  allowLeadingWildcards: boolean;
}

export function fromKueryExpression(
  expression: string | DslQuery,
  parseOptions?: Partial<KueryParseOptions>
): KueryNode;

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: any,
  config?: Record<string, any>,
  context?: Record<string, any>
): JsonObject;

export function doesKueryExpressionHaveLuceneSyntaxError(expression: string): boolean;
