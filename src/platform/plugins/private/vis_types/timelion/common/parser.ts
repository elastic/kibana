/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-ignore
import { parse } from '@kbn/timelion-grammar';

export interface ExpressionLocation {
  min: number;
  max: number;
}

interface ExpressionItem {
  name: string;
  function: string;
  location: ExpressionLocation;
  text: string;
  type: string;
}

export interface TimelionExpressionArgument extends ExpressionItem {
  value: {
    location: ExpressionLocation;
    type: string;
    value: string;
    text: string;
  };
}

export interface TimelionExpressionFunction extends ExpressionItem {
  arguments: TimelionExpressionArgument[];
}

export interface TimelionExpressionChain {
  chain: TimelionExpressionFunction[];
  type: 'chain';
}

export interface ParsedExpression {
  args: TimelionExpressionArgument[];
  functions: TimelionExpressionFunction[];
  tree: TimelionExpressionChain[];
  variables: Record<string, any>;
}

export const parseTimelionExpression = (input: string): ParsedExpression => parse(input);
