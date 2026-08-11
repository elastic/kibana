/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import invoke from './test_helpers/invoke_series_fn';
import fn from './props';

describe('props.js', () => {
  let seriesList;

  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('sets safe nested properties on each series', async () => {
    const result = await invoke(fn, [seriesList, null, ['lines.fill'], [0.5]]);
    expect(result.output.list[0].lines.fill).to.equal(0.5);
    expect(result.output.list[1].lines.fill).to.equal(0.5);
  });

  it('rejects attempts to overwrite series.data (e.g. data.length=...)', async () => {
    try {
      await invoke(fn, [seriesList, null, ['data.length'], [666]]);
      throw new Error('expected invoke to throw');
    } catch (e) {
      expect(e.message).to.contain('props()');
      expect(e.message).to.contain('data.length');
    }
  });

  it('rejects attempts to overwrite seriesList.list when used globally', async () => {
    try {
      await invoke(fn, [seriesList, true, ['list.length'], [666]]);
      throw new Error('expected invoke to throw');
    } catch (e) {
      expect(e.message).to.contain('props()');
      expect(e.message).to.contain('list.length');
    }
  });
});
