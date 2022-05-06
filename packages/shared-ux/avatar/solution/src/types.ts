/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';

type Caps =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';

type StartsWith<T, S extends string> = T extends `${S}${infer _X}` ? _X : never;
type ExtractName<S extends string> = S extends `${infer N}` ? N : { error: 'Cannot parse name' };
type SpacedNames<T extends string> = T extends `${infer firstCapital}${infer rest}`
  ? `${firstCapital}${ParseSpacedNames<rest>}`
  : never;

// NOTE: This will NOT work with logo names with more than two words. Since we don't have any, we opted
// to not melt our brains trying to figure out how to work out the recursion.
type ParseSpacedNames<T extends string> = T extends `${infer head}${Caps}${infer tail}`
  ? T extends `${head}${infer cap}${tail}`
    ? `${head} ${cap}${tail}`
    : never
  : T;

export type SolutionNameType = SpacedNames<ExtractName<StartsWith<EuiIconType, 'logo'>>>;
