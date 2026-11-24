/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDrift, ConnectorDrift, SpecChange } from './detect_drift';
import { newInVendorApi } from './new_in_vendor_api';

const added = (id: string, text: string, operation = 'POST /scrape'): SpecChange => ({
  kind: 'non-breaking',
  id,
  text,
  operation,
});

const action = (name: string, overrides: Partial<ActionDrift> = {}): ActionDrift => ({
  action: name,
  operations: [{ source: 'v2', operation: 'POST /scrape', latest: { status: 'present' } }],
  unmatched: [],
  snapshotProblems: [],
  latestProblems: [],
  tracked: true,
  fieldUse: {
    'v2 POST /scrape': {
      read: ['data/markdown'],
      copied: [],
      returned: [],
      sent: ['?mode', 'formats', 'formats/items', 'url'],
    },
  },
  ...overrides,
});

const driftWith = (changes: SpecChange[], actions: ActionDrift[]): ConnectorDrift => ({
  connector: '.acme',
  sources: { v2: { status: 'changed', changes } },
  operationsChanged: false,
  snapshotProblems: [],
  latestProblems: [],
  verdict: 'healthy',
  overlayFindings: [],
  outcome: 'refresh',
  actions,
});

describe('newInVendorApi', () => {
  it('lists the additions to called operations with the actions they reach', () => {
    const passing = action('scrapeRaw', {
      fieldUse: { 'v2 POST /scrape': { read: [], copied: [], returned: [''], sent: [] } },
    });
    const additions = newInVendorApi(
      driftWith(
        [
          added(
            'new-optional-request-property',
            'added the new optional request property `allOf[#/components/schemas/Options]/checkPromptInjection`'
          ),
          added(
            'new-optional-request-parameter',
            'added the new optional `query` request parameter `mode`'
          ),
          added(
            'request-property-one-of-added',
            'added `subschema #8: Attributes` to the `formats/items` request property `oneOf` list'
          ),
          added(
            'response-optional-property-added',
            'added the optional property `data/attributes` to the response with the `200` status'
          ),
          added(
            'response-optional-property-added',
            'added the optional property `data/attributes/name` to the response with the `200` status'
          ),
          added(
            'response-optional-property-added',
            'added the optional property `data/elsewhere` to the response with the `200` status',
            'GET /uncalled'
          ),
          {
            kind: 'breaking',
            id: 'request-property-max-set',
            text: 'max set',
            operation: 'POST /scrape',
          },
        ],
        [action('scrape'), passing]
      )
    );

    expect(additions.map(({ kind, field, reachedBy }) => ({ kind, field, reachedBy }))).toEqual([
      { kind: 'query-parameter', field: 'mode', reachedBy: ['scrape'] },
      { kind: 'request-option', field: 'checkPromptInjection', reachedBy: [] },
      { kind: 'request-value', field: 'formats/items', reachedBy: ['scrape'] },
      // `data/attributes/name` is inside it, so it has no row of its own
      { kind: 'response-field', field: 'data/attributes', reachedBy: ['scrapeRaw'] },
    ]);
    expect(additions[0].actions).toEqual(['scrape', 'scrapeRaw']);
  });

  it("says which callers' field use wasn't recorded", () => {
    const [addition] = newInVendorApi(
      driftWith(
        [
          added(
            'response-optional-property-added',
            'added the optional property `data/attributes` to the response with the `200` status'
          ),
        ],
        [action('scrape', { tracked: false })]
      )
    );

    expect(addition).toMatchObject({ reachedBy: [], unknownFor: ['scrape'] });
  });
});
