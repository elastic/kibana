/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as rt from 'io-ts';

export const isEmptyString = (value: string) => value === '';

export const containsSpaces = (value: string) => value.includes(' ');

export const containsEmptyEntries = (value: string) => value.split(',').some(isEmptyString);

export const validateIndexPattern = (indexPattern: string) => {
  return (
    !isEmptyString(indexPattern) &&
    !containsSpaces(indexPattern) &&
    !containsEmptyEntries(indexPattern)
  );
};

export interface IndexPatternBrand {
  readonly IndexPattern: unique symbol;
}

type IndexPattern = rt.Branded<string, IndexPatternBrand>;

export const indexPatternRt = rt.brand(
  rt.string,
  (pattern): pattern is IndexPattern => validateIndexPattern(pattern),
  'IndexPattern'
);

export type IndexPatternType = rt.TypeOf<typeof indexPatternRt>;
