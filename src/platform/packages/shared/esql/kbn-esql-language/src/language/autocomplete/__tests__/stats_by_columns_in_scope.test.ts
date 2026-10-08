/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('autocomplete - columns defined in a STATS BY clause', () => {
  const suggestedLabels = async (query: string) => {
    const { suggest } = await setup();
    return (await suggest(query)).map(({ label }) => label);
  };

  it('suggests a BY-defined column inside an aggregation function argument', async () => {
    expect(await suggestedLabels('FROM a | STATS AVG(/) BY abc = doubleField')).toContain('abc');
  });

  it('suggests a BY-defined column inside an unclosed aggregation function argument', async () => {
    expect(await suggestedLabels('FROM a | STATS AVG(/ BY abc = doubleField')).toContain('abc');
  });

  it('suggests a BY-defined column in the per-aggregation WHERE clause', async () => {
    expect(await suggestedLabels('FROM a | STATS COUNT() WHERE /BY abc = keywordField')).toContain(
      'abc'
    );
  });

  it('suggests a bare expression grouping referenced in an aggregation', async () => {
    expect(await suggestedLabels('FROM a | STATS COUNT(/) BY BUCKET(dateField, 1 day)')).toContain(
      'BUCKET(dateField, 1 day)'
    );
  });

  it('does not suggest a BY-defined column within the BY clause itself', async () => {
    expect(
      await suggestedLabels('FROM a | STATS COUNT() BY abc = keywordField, def = /')
    ).not.toContain('abc');
  });
});
