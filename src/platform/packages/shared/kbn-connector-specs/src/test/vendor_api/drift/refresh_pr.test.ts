/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDrift, ConnectorDrift, SpecChange } from './detect_drift';
import { healthy } from './drift_fixtures';
import { renderRefreshPr } from './refresh_pr';

const MAX_LENGTH = 63_000;

const added = (
  operation: string | undefined,
  text: string,
  id = 'response-optional-property-added'
): SpecChange => ({
  kind: 'non-breaking',
  id,
  text,
  ...(operation ? { operation } : {}),
});
const field = (operation: string | undefined, name: string): SpecChange =>
  added(operation, `added the optional property \`${name}\` to the response`);
const calling = (action: string, ...operations: string[]): ActionDrift => ({
  action,
  operations: operations.map((operation) => ({ source: 'main', operation })),
  unmatched: [],
  snapshotProblems: [],
});
const changed = (
  connector: string,
  changes: SpecChange[],
  actions: ActionDrift[] = []
): ConnectorDrift => ({
  ...healthy,
  connector,
  sources: { main: { status: 'changed', changes } },
  outcome: 'refresh',
  actions,
});
const manyFields = (operation: string, count: number, length = 20): SpecChange[] =>
  Array.from({ length: count }, (_, index) =>
    field(operation, `${'x'.repeat(length)}${String(index).padStart(4, '0')}`)
  );
const listedNames = (body: string, connector: string): number => {
  const section = body.split('### ').find((part) => part.startsWith(`\`${connector}\``)) ?? '';
  return section.split('\n').filter((line) => line.startsWith('+ ')).length;
};

describe('renderRefreshPr', () => {
  it('says how many changes the spec brought and folds the table away', () => {
    const body = renderRefreshPr([
      changed(
        '.other',
        [field('GET /a', 'title'), field('GET /b', 'name')],
        [calling('listA', 'GET /a'), calling('getA', 'GET /a'), calling('listB', 'GET /b')]
      ),
    ]);

    expect(body).toContain(
      [
        '### `.other`',
        '',
        'New vendor spec captured. It contained 2 changes. All connector actions still work as before.',
        '',
        '<details>',
        '<summary>2 changed endpoints</summary>',
        '',
        '<table>',
        '<tr><th>Endpoint</th><th>What changed</th><th>Used in action</th></tr>',
        '<tr>',
        '<td>',
        '',
        '`GET /a`',
        '',
        '</td>',
        '<td>',
        '',
        '**Response fields**',
        '```diff',
        'added',
        '+ title',
        '```',
        '',
        '</td>',
        '<td>',
        '',
        '`getA` and `listA`',
        '',
        '</td>',
        '</tr>',
      ].join('\n')
    );
    expect(body).toContain('+ name\n```');
    expect(body).toContain('`listB`');
    expect(body).toMatch(/<\/table>\n\n<\/details>/);
  });

  it('says "1 change" for a single change', () => {
    expect(renderRefreshPr([changed('.other', [field('GET /a', 'x')])])).toContain(
      'It contained 1 change. All connector actions'
    );
  });

  it('has no table for a spec that changed outside what oasdiff reports', () => {
    const body = renderRefreshPr([
      { ...healthy, connector: '.moved', sources: {}, operationsChanged: true },
      { ...healthy, connector: '.quiet', sources: {} },
    ]);

    expect(body).toContain(
      '### `.moved`\n\nNew vendor spec captured. It contained changes that `oasdiff` does not report. All connector actions still work as before.\n\n- The actions call other operations.'
    );
    expect(body).toContain('### `.quiet`\n\nNew vendor spec captured. It contained changes');
    expect(body).not.toContain('<details>');
  });

  it('lists the connectors alphabetically', () => {
    const body = renderRefreshPr(
      ['.zoom', '.1password', '.bigquery'].map((connector) =>
        changed(connector, [field('GET /a', 'x')])
      )
    );

    const order = [...body.matchAll(/^### `(\.[^`]+)`/gm)].map(([, connector]) => connector);
    expect(order).toEqual(['.1password', '.bigquery', '.zoom']);
  });

  it('puts every area of an endpoint in its cell', () => {
    const body = renderRefreshPr([
      changed('.other', [
        field('GET /a', 'title'),
        added('GET /a', 'response property `old` deprecated', 'response-property-deprecated'),
      ]),
    ]);

    expect(body).toContain('```diff\nadded\n+ title\n\nchanged\n! old (deprecated)\n```');
  });

  it('names an endpoint no action is recorded on with a dash, and keeps unlocated changes last', () => {
    const body = renderRefreshPr([
      changed('.other', [field(undefined, 'servers'), field('GET /a', 'x')]),
    ]);

    const endpoints = body
      .split('<tr>\n<td>\n\n')
      .slice(1)
      .map((row) => row.split('\n')[0]);
    expect(endpoints).toEqual(['`GET /a`', '—']);
  });

  it('cuts the table of a connector after 20 endpoints and counts the rest', () => {
    const body = renderRefreshPr([
      changed(
        '.other',
        Array.from({ length: 23 }, (_, index) =>
          field(`GET /e${String(index).padStart(2, '0')}`, 'x')
        )
      ),
    ]);

    expect(body).toContain('<summary>23 changed endpoints</summary>');
    expect(body).toContain('`GET /e19`');
    expect(body).not.toContain('`GET /e20`');
    expect(body).toContain('…and 3 more endpoints; the drift report lists them.\n\n</details>');
  });

  describe('how many names a list shows', () => {
    it('shows the names of a list that is only a little over ten when there is room', () => {
      const body = renderRefreshPr([changed('.other', manyFields('GET /a', 13))]);

      expect(listedNames(body, '.other')).toBe(13);
      expect(body).not.toContain('… and');
    });

    it('shows as many names as fit, the lists with the fewest left out first', () => {
      const body = renderRefreshPr([
        changed('.a', manyFields('GET /a', 1000, 80)),
        changed('.b', manyFields('GET /b', 12)),
        changed('.c', manyFields('GET /c', 15)),
      ]);

      // The short lists are shown whole, and the long one gets what is left.
      expect(listedNames(body, '.b')).toBe(12);
      expect(listedNames(body, '.c')).toBe(15);
      const shownOfLong = listedNames(body, '.a');
      expect(shownOfLong).toBeGreaterThan(10);
      expect(shownOfLong).toBeLessThan(1000);
      expect(body).toContain(`… and ${1000 - shownOfLong} more response fields`);
      expect(body.length).toBeLessThanOrEqual(MAX_LENGTH);
      expect(body.length).toBeGreaterThan(MAX_LENGTH - 400);
    });

    it('shows fewer than ten names rather than leave a connector out', () => {
      const body = renderRefreshPr(
        Array.from({ length: 60 }, (_, index) =>
          changed(`.connector${String(index).padStart(2, '0')}`, manyFields('GET /a', 30, 60))
        )
      );

      const included = [...body.matchAll(/^### `(\.connector\d+)`/gm)].map(([, name]) => name);
      expect(included).toHaveLength(60);
      expect(body).not.toContain('more connector');
      expect(body.length).toBeLessThanOrEqual(MAX_LENGTH);
      expect(body.length).toBeGreaterThan(MAX_LENGTH - 200);
      expect(listedNames(body, '.connector59')).toBeLessThan(10);
      expect(listedNames(body, '.connector59')).toBeGreaterThan(0);
    });

    it('shows ten names where that fits every connector', () => {
      const body = renderRefreshPr(
        Array.from({ length: 12 }, (_, index) =>
          changed(`.connector${String(index).padStart(2, '0')}`, manyFields('GET /a', 40, 60))
        )
      );

      expect(listedNames(body, '.connector11')).toBeGreaterThanOrEqual(10);
      expect(body.length).toBeLessThanOrEqual(MAX_LENGTH);
    });
  });

  const wide = (connector: string) =>
    changed(
      connector,
      Array.from({ length: 20 }, (_, endpoint) =>
        field(`GET /${endpoint}`, `${'y'.repeat(53)}${endpoint}`)
      )
    );

  it('still fits a small connector after one too big to fit', () => {
    const body = renderRefreshPr([
      ...Array.from({ length: 40 }, (_, index) => wide(`.big${String(index).padStart(2, '0')}`)),
      changed('.small', [field('GET /a', 'x')]),
    ]);

    expect(body).toContain('### `.small`');
    expect(body).toMatch(/The changes of `\.big\d+`/);
  });

  it('stays under the limit GitHub puts on a description, naming the connectors left out', () => {
    const body = renderRefreshPr(
      Array.from({ length: 60 }, (_, index) => wide(`.connector${index}`))
    );

    expect(body.length).toBeLessThan(65_536);
    expect(body).toContain('### `.connector0`');
    expect(body).toMatch(/### \d+ more connectors\n\nThe changes of `\.connector\d+`/);
    expect(body).toContain("don't fit in a pull request description");
  });
});
