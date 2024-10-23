/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitByEverything } from './split_by_everything';

describe('splitByEverything(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  beforeEach(() => {
    panel = {};
    series = { id: 'test', split_mode: 'everything' };
    req = {
      body: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
  });

  it('calls next when finished', () => {
    const next = jest.fn();
    splitByEverything(req, panel, series)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  it('returns a valid filter with match_all', () => {
    const next = (doc) => doc;
    const doc = splitByEverything(req, panel, series)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          filter: {
            match_all: {},
          },
        },
      },
    });
  });

  it('calls next and does not add a filter', () => {
    series.split_mode = 'terms';
    series.terms_field = 'host';
    const next = jest.fn((doc) => doc);
    const doc = splitByEverything(req, panel, series)(next)({});
    expect(next.mock.calls.length).toEqual(1);
    expect(doc).toEqual({});
  });
});
