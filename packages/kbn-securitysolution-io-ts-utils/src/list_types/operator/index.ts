/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const operator = t.keyof({ excluded: null, included: null });
export type Operator = t.TypeOf<typeof operator>;
export enum OperatorEnum {
  INCLUDED = 'included',
  EXCLUDED = 'excluded',
}

export enum OperatorTypeEnum {
  NESTED = 'nested',
  MATCH = 'match',
  MATCH_ANY = 'match_any',
  WILDCARD = 'wildcard',
  EXISTS = 'exists',
  LIST = 'list',
}
