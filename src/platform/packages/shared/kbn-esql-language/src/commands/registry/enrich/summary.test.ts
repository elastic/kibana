/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import { summary } from './summary';

describe('ENRICH > summary', () => {
  it('doesnt add new columns when WITH option is not specified', () => {
    const result = summary(synth.cmd`ENRICH policy ON matchfield`, '');
    expect(result).toEqual({ newColumns: new Set([]) });
  });

  it('doesnt add new columns when WITH option is specified without assignments', () => {
    const result = summary(synth.cmd`ENRICH policy ON matchfield WITH enrichField`, '');
    expect(result).toEqual({ newColumns: new Set([]), renamedColumnsPairs: new Set([]) });
  });

  it('adds the given names as columns and renamed pairs when WITH with assignment is specified', () => {
    const result = summary(
      synth.cmd`ENRICH policy ON matchfield WITH foo = enrichField1, bar = enrichField2`,
      ''
    );
    expect(result).toEqual({
      newColumns: new Set(['foo', 'bar']),
      renamedColumnsPairs: new Set([
        ['foo', 'enrichField1'],
        ['bar', 'enrichField2'],
      ]),
    });
  });
});
