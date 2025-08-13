/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { setup } from './helpers';

describe('STATS autocomplete', () => {
  test('should suggest for fresh expression', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS /')).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['AVG($0)', 'COUNT($0)']));
  });

  test('should suggest for assignment expression', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS col0 = /')).map((s) => s.text);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).not.toContain(' = ');
  });

  test('should suggest inside function (early return path)', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS ACOS(/)')).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['doubleField', 'integerField']));
  });

  test('should suggest after space following aggregate field', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS a=MIN(integerField) /')).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['WHERE ', 'BY ', ', ', '| ']));
  });

  test('should suggest fields inside avg(', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS AVG(/)')).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['doubleField', 'integerField']));
  });

  test('should suggest in WHERE (empty expression)', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS MIN(doubleField) WHERE /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining(['doubleField ', 'keywordField ']));
  });

  test('should suggest operators after first operand in WHERE', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS MIN(doubleField) WHERE keywordField /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining(['== $0', '!= $0', '>= $0']));
  });

  test('should suggest fields after operator in WHERE', async () => {
    const { suggest } = await setup();
    const suggestions = (
      await suggest('FROM a | STATS MIN(doubleField) WHERE keywordField != /')
    ).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['keywordField', 'textField']));
  });

  test('should suggest pipe/comma/BY after complete boolean WHERE expression', async () => {
    const { suggest } = await setup();
    const suggestions = (
      await suggest('FROM a | STATS MIN(doubleField) WHERE keywordField != keywordField /')
    ).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['| ', ', ', 'BY ']));
  });

  test('should suggest in BY without assignment', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS COUNT() BY /')).map((s) => s.text);
    const hasBucket = suggestions.some((t) => t.toUpperCase().startsWith('BUCKET('));
    expect(hasBucket).toBe(true);
    expect(suggestions).toEqual(expect.arrayContaining(['integerField', 'keywordField']));
  });

  test('should not include grouping functions as args to scalar function in BY', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS a=MIN(b) BY ACOS(/)')).map((s) => s.text);
    expect(suggestions).toEqual(expect.not.arrayContaining(['CATEGORIZE($0)']));
  });

  test('should suggest in BY after assignment', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS COUNT() BY col0 = /')).map((s) => s.text);
    const hasBucket = suggestions.some((t) => t.toUpperCase().startsWith('BUCKET('));
    expect(hasBucket).toBe(true);
    expect(suggestions).toEqual(expect.arrayContaining(['integerField', 'keywordField']));
  });

  test('should suggest comma and pipe after complete BY expression', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS COUNT() BY integerField /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining([', ', '| ']));
  });

  test('should include operators after complete aggregate expression', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS col0 = MIN(doubleField) /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(
      expect.arrayContaining(['+ $0', '!= $0', 'WHERE ', 'BY ', ', ', '| '])
    );
  });

  test('should suggest fields for first BUCKET() arg in BY', async () => {
    const { suggest } = await setup();
    const suggestions = (
      await suggest('FROM a | STATS COUNT() BY BUCKET(/, 50, ?_tstart, ?_tend)')
    ).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['dateField', 'doubleField']));
  });

  test('should suggest operators after NOT keyword in BY', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS COUNT() BY keywordField NOT /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining(['LIKE $0', 'RLIKE $0', 'IN $0']));
  });

  test('should not show previous columns after pipe with STATS', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS AVG(doubleField) | KEEP /')).map(
      (s) => s.text
    );
    // Only derived column should be present, not raw doubleField
    expect(suggestions).toEqual(expect.arrayContaining(['`AVG(doubleField)`']));
    expect(suggestions).toEqual(expect.not.arrayContaining(['doubleField']));
  });

  test('should expose user-defined column after pipe (no grouping)', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | STATS var0=AVG(doubleField) | KEEP /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining(['var0']));
    expect(suggestions).toEqual(expect.not.arrayContaining(['doubleField']));
  });

  test('should expose escaped and grouping columns after pipe', async () => {
    const { suggest } = await setup();
    const suggestions = (
      await suggest('FROM a | STATS AVG(doubleField) BY keywordField | KEEP /')
    ).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['`AVG(doubleField)`', 'keywordField']));
    expect(suggestions).toEqual(expect.not.arrayContaining(['doubleField']));
  });

  test('should expose user-defined and BUCKET alias after pipe', async () => {
    const { suggest } = await setup();
    const suggestions = (
      await suggest(
        'FROM a | STATS AVG(doubleField) BY buckets=BUCKET(dateField,50,?_tstart,?_tend) | KEEP /'
      )
    ).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['`AVG(doubleField)`', 'buckets']));
    expect(suggestions).toEqual(expect.not.arrayContaining(['doubleField']));
  });
});

describe('INLINESTATS autocomplete', () => {
  // Basic cases based on the position
  test('should suggest for fresh expression', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | INLINESTATS /')).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['AVG($0)', 'COUNT($0)']));
  });

  test('should suggest for assignment expression', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | INLINESTATS col0 = /')).map((s) => s.text);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).not.toContain(' = ');
  });

  test('should suggest after complete aggregate expression', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | INLINESTATS a=MIN(doubleField) /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining(['WHERE ', 'BY ', ', ', '| ']));
  });

  test('should suggest in BY without assignment', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | INLINESTATS COUNT() BY /')).map((s) => s.text);
    const hasBucket = suggestions.some((t) => t.toUpperCase().startsWith('BUCKET('));
    expect(hasBucket).toBe(true);
    expect(suggestions).toEqual(expect.arrayContaining(['integerField', 'keywordField']));
  });

  test('should suggest in BY after assignment', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | INLINESTATS COUNT() BY col0 = /')).map(
      (s) => s.text
    );
    const hasBucket = suggestions.some((t) => t.toUpperCase().startsWith('BUCKET('));
    expect(hasBucket).toBe(true);
    expect(suggestions).toEqual(expect.arrayContaining(['integerField', 'keywordField']));
  });

  // After columns cases
  test('should keep previous columns after pipe with INLINESTATS', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | INLINESTATS AVG(doubleField) | KEEP /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining(['`AVG(doubleField)`', 'doubleField']));
  });

  test('should expose user-defined column and previous columns after pipe (no grouping)', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | INLINESTATS var0=AVG(doubleField) | KEEP /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining(['var0', 'doubleField']));
  });

  test('should expose escaped, grouping, and previous columns after pipe', async () => {
    const { suggest } = await setup();
    const suggestions = (
      await suggest('FROM a | INLINESTATS AVG(doubleField) BY keywordField | KEEP /')
    ).map((s) => s.text);
    expect(suggestions).toEqual(
      expect.arrayContaining(['`AVG(doubleField)`', 'keywordField', 'doubleField'])
    );
  });

  test('should expose user-defined and BUCKET alias plus previous columns after pipe', async () => {
    const { suggest } = await setup();
    const suggestions = (
      await suggest(
        'FROM a | INLINESTATS AVG(doubleField) BY buckets=BUCKET(dateField,50,?_tstart,?_tend) | KEEP /'
      )
    ).map((s) => s.text);
    expect(suggestions).toEqual(
      expect.arrayContaining(['`AVG(doubleField)`', 'buckets', 'doubleField'])
    );
  });

  // Cases where INLINESTATS gives the same result of STATS
  test('should suggest operators after NOT keyword in BY', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM a | INLINESTATS COUNT() BY keywordField NOT /')).map(
      (s) => s.text
    );
    expect(suggestions).toEqual(expect.arrayContaining(['LIKE $0', 'RLIKE $0', 'IN $0']));
  });

  test('should suggest operators after operator in WHERE', async () => {
    const { suggest } = await setup();
    const suggestions = (
      await suggest('FROM a | INLINESTATS MIN(doubleField) WHERE keywordField != /')
    ).map((s) => s.text);
    expect(suggestions).toEqual(expect.arrayContaining(['== $0', '!= $0', '>= $0']));
  });
});
