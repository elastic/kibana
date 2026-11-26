/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDrift, ConnectorDrift, SpecChange } from '../detect_drift';
import { healthy } from '../drift_fixtures';
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
  it('keeps an endpoint that two sources describe apart, with its own actions', () => {
    const body = renderRefreshPr([
      {
        ...changed('.two', []),
        sources: {
          v1: { status: 'changed', changes: [field('GET /items', 'a')] },
          v2: { status: 'changed', changes: [field('GET /items', 'b')] },
        },
        actions: [
          {
            action: 'listOld',
            operations: [{ source: 'v1', operation: 'GET /items' }],
            unmatched: [],
            snapshotProblems: [],
          },
        ],
      },
    ]);
    const rows = body.split('<tr>').slice(2);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('`GET /items` (`v1`)');
    expect(rows[0]).toContain('`listOld`');
    expect(rows[1]).toContain('`GET /items` (`v2`)');
    expect(rows[1]).not.toContain('`listOld`');
  });

  it('counts no endpoint for changes to the spec as a whole', () => {
    const body = renderRefreshPr([
      changed('.wide', [
        added(
          undefined,
          'the component security scheme `apiKey` was added',
          'api-security-component-added'
        ),
      ]),
    ]);

    expect(body).toContain('New spec has 1 change to the spec as a whole.');
  });

  it('counts each time a GraphQL or MCP change was reported, as its line does', () => {
    const graphql = added(
      undefined,
      'Field "Board.url" was added to object type "Board".',
      'FIELD_ADDED'
    );

    expect(renderRefreshPr([changed('.graphql', [graphql, graphql])])).toContain(
      'New spec has 2 changes to the spec as a whole.'
    );
  });

  it('counts the changes to endpoints and to the spec as a whole apart', () => {
    const body = renderRefreshPr([
      changed('.mixed', [
        field('GET /a', 'title'),
        added(
          undefined,
          'the component security scheme `apiKey` was added',
          'api-security-component-added'
        ),
      ]),
    ]);

    expect(body).toContain(
      'New spec has 1 change on 1 endpoint that the connector uses, and 1 change to the spec as a whole.'
    );
  });

  it('finds the actions that call an MCP tool, which the manifest names `tools/call <tool>`', () => {
    const body = renderRefreshPr([
      changed(
        '.mcp',
        [added('search', 'search: input.limit was added', 'mcp-input-property-added')],
        [calling('searchItems', 'tools/call search')]
      ),
    ]);

    expect(body).toContain('`searchItems`');
  });

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
        'New spec has 2 changes on 2 endpoints that the connector uses.',
        '',
        '<details>',
        '<summary>See changes</summary>',
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
        '**Response**',
        '```diff',
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

  it('says "1 change on 1 endpoint" for a single change', () => {
    expect(renderRefreshPr([changed('.other', [field('GET /a', 'x')])])).toContain(
      'New spec has 1 change on 1 endpoint that the connector uses.\n'
    );
  });

  it('counts a field once, however many times oasdiff reported it', () => {
    const body = renderRefreshPr([
      changed(
        '.other',
        ['application/json', 'application/cbor', 'application/yaml'].map((type) =>
          added(
            'GET /a',
            `added the optional property \`x\` to the response with the \`200\` status (media type: ${type})`
          )
        )
      ),
    ]);

    expect(body).toContain('New spec has 1 change on 1 endpoint that the connector uses.');
  });

  it('counts the changes of every endpoint, also those the table leaves out', () => {
    const body = renderRefreshPr([
      changed(
        '.other',
        Array.from({ length: 23 }, (_, index) =>
          field(`GET /e${String(index).padStart(2, '0')}`, 'x')
        )
      ),
    ]);

    expect(body).toContain('New spec has 23 changes on 23 endpoints that the connector uses.');
  });

  it('says so when the new spec only regrouped the auth scopes', () => {
    const scheme = (id: string, scope: string): SpecChange =>
      added(
        'GET /a',
        `the endpoint scheme security \`Oauth2: [https://x/auth/${scope}]\` was ${
          id.endsWith('-added') ? 'added to' : 'removed from'
        } the API`,
        id
      );
    const body = renderRefreshPr([
      changed('.other', [scheme('api-security-removed', 'a'), scheme('api-security-added', 'a')]),
    ]);

    expect(body).toContain(
      'New spec only regroups the auth scopes of 1 endpoint that the connector uses.\n'
    );
    expect(body).not.toContain('<details>');

    // Next to real changes, an endpoint that only regrouped its scopes has no row and isn't counted
    const mixed = renderRefreshPr([
      changed('.other', [
        scheme('api-security-removed', 'a'),
        scheme('api-security-added', 'a'),
        field('GET /b', 'name'),
      ]),
    ]);
    expect(mixed).toContain('New spec has 1 change on 1 endpoint that the connector uses.');
    expect(mixed).toContain('`GET /b`');
    expect(mixed).not.toContain('GET /a');
  });

  it('has no table for a spec that changed outside what oasdiff reports', () => {
    const body = renderRefreshPr([
      { ...healthy, connector: '.moved', sources: {}, operationsChanged: true },
      { ...healthy, connector: '.quiet', sources: {} },
    ]);

    expect(body).toContain(
      '### `.moved`\n\nNew spec has changes that `oasdiff` does not report.\n\n- The actions call other operations.'
    );
    expect(body).toContain('### `.quiet`\n\nNew spec has changes');
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

    expect(body).toContain('```diff\n+ title\n! old (deprecated)\n```');
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

    expect(body).toContain('<summary>See changes</summary>');
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
      expect(body).toContain(`… and ${1000 - shownOfLong} more added`);
      expect(body.length).toBeLessThanOrEqual(MAX_LENGTH);
      expect(body.length).toBeGreaterThan(MAX_LENGTH - 400);
    });

    it('shows fewer than ten names rather than leave a connector out', () => {
      const body = renderRefreshPr(
        Array.from({ length: 90 }, (_, index) =>
          changed(`.connector${String(index).padStart(2, '0')}`, manyFields('GET /a', 30, 60))
        )
      );

      const included = [...body.matchAll(/^### `(\.connector\d+)`/gm)].map(([, name]) => name);
      expect(included).toHaveLength(90);
      expect(body).not.toContain('more connector');
      expect(body.length).toBeLessThanOrEqual(MAX_LENGTH);
      expect(body.length).toBeGreaterThan(MAX_LENGTH - 200);
      expect(listedNames(body, '.connector89')).toBeLessThan(10);
      expect(listedNames(body, '.connector89')).toBeGreaterThan(0);
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
        field(`GET /${endpoint}`, `${'y'.repeat(56)}${endpoint}`)
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

  it('leaves room for the note on the connectors left out, however the others fit', () => {
    const tooLong: Array<{ width: number; length: number }> = [];
    for (let width = 40; width <= 70; width++) {
      const { length } = renderRefreshPr(
        Array.from({ length: 40 }, (_, index) =>
          changed(
            `.big${String(index).padStart(2, '0')}`,
            Array.from({ length: 20 }, (__, endpoint) =>
              field(`GET /${endpoint}`, `${'y'.repeat(width)}${endpoint}`)
            )
          )
        )
      );
      if (length > 63_000) {
        tooLong.push({ width, length });
      }
    }

    expect(tooLong).toEqual([]);
  });

  it('stays under the limit GitHub puts on a description, naming the connectors left out', () => {
    const body = renderRefreshPr(
      Array.from({ length: 60 }, (_, index) => wide(`.connector${index}`))
    );

    expect(body.length).toBeLessThanOrEqual(63_000);
    expect(body).toContain('### `.connector0`');
    expect(body).toMatch(/### \d+ more connectors\n\nThe changes of `\.connector\d+`/);
    expect(body).toContain("don't fit in a pull request description");
  });
});
