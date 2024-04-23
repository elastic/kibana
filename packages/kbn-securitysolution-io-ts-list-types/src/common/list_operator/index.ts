/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const listOperator = t.keyof({ excluded: null, included: null });
export type ListOperator = t.TypeOf<typeof listOperator>;
export enum ListOperatorEnum {
  INCLUDED = 'included',
  EXCLUDED = 'excluded',
}

export const listOperatorType = t.keyof({
  nested: null,
  match: null,
  match_any: null,
  wildcard: null,
  exists: null,
  list: null,
});
export type ListOperatorType = t.TypeOf<typeof listOperatorType>;
export enum ListOperatorTypeEnum {
  NESTED = 'nested',
  MATCH = 'match',
  MATCH_ANY = 'match_any',
  WILDCARD = 'wildcard',
  EXISTS = 'exists',
  LIST = 'list',
}
