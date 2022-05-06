/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';

type StartsWith<T, S extends string> = T extends `${S}${infer _X}` ? _X : never;
type ExtractName<S extends string> = S extends `${infer N}` ? N : { error: 'Cannot parse name' };
type RemoveSpaces<T extends string> = T extends `${infer F} ${infer L}` ? `${F}${L}` : never;

// Exhaustive list at present.  Reduces complexity of TS checking at the expense of not being dynamic
// against a very, very static list.
//
// The only consequence is requiring a solution name without a space, (e.g. `ElasticStack`) until it's added
// here.  That's easy to do in the very unlikely event that ever happens.
type SpacedNames =
  | 'AWS Mono'
  | 'App Search'
  | 'Azure Mono'
  | 'Business Analytics'
  | 'Cloud Enterprise'
  | 'Elastic Stack'
  | 'Enterprise Search'
  | 'GCP Mono'
  | 'IBM Mono'
  | 'Site Search'
  | 'Workplace Search';

type Names = Exclude<ExtractName<StartsWith<EuiIconType, 'logo'>>, RemoveSpaces<SpacedNames>>;
export type SolutionNameType = Names | SpacedNames;
