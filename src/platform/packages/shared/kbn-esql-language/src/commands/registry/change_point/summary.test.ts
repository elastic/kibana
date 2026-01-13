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

describe('CHANGE_POINT > summary', () => {
  it('adds "type" and "pvalue" fields, when AS option not specified', () => {
    const result = summary(synth.cmd`CHANGE_POINT count ON field1`, '');
    expect(result).toEqual({ newColumns: new Set(['type', 'pvalue']) });
  });

  it('adds the given names as fields, when AS option is specified', () => {
    const result = summary(synth.cmd`CHANGE_POINT count ON field1 AS changePointType, pValue`, '');
    expect(result).toEqual({ newColumns: new Set(['changePointType', 'pValue']) });
  });
});
