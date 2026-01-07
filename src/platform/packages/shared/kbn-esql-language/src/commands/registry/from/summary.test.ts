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

describe('FROM > summary', () => {
  it('returns an empty list if METADATA is not present', () => {
    const result = summary(synth.cmd`FROM index`, '');
    expect(result).toEqual({ newColumns: new Set([]), metadataColumns: new Set([]) });
  });

  it('returns the metadata columns if METADATA is present', () => {
    const result = summary(synth.cmd`FROM index METADATA _index, _id`, '');
    expect(result).toEqual({
      newColumns: new Set([]),
      metadataColumns: new Set(['_index', '_id']),
    });
  });
});
