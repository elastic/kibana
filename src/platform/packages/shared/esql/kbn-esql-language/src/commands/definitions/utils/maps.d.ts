/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMapEntry, ESQLSingleAstItem } from '@elastic/esql/types';
import { type MapValueType } from '../../registry/complete_items';
export declare const MAP_PARAMS_REGEX: RegExp;
type ParsedMapParameter = Record<
  string,
  {
    type: MapValueType;
    rawType: string;
    description: string;
    values: string[];
  }
>;
export declare function getMapNestingLevel(text: string): number;
/**
 * Checks if the cursor is inside an unclosed map expression.
 */
export declare function isInsideMapExpression(text: string): boolean;
/**
 * Finds a string-keyed entry in an ES|QL map AST.
 */
export declare function getMapEntryByStringKeyFromAst(
  map: ESQLSingleAstItem | undefined,
  name: string
): ESQLMapEntry | undefined;
/** Returns string literal values from a list-valued map entry. */
export declare function getMapStringListValuesFromAst(
  map: ESQLSingleAstItem | undefined,
  name: string
): string[] | undefined;
/**
 * Parses a mapParams definition string into ParsedMapParameter.
 *
 * Input:  "{name='boost', values=[2.5], description='Boost value', type=[float]}, {name='analyzer', values=[standard], description='analyzer used', type=[keyword]}"
 * Output: { boost: { type: 'number', ... }, analyzer: { type: 'string', ... } }
 */
export declare function parseMapParams(mapParamsStr: string): ParsedMapParameter;
export {};
