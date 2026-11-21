/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getUnsupportedFindAggsReason } from './validate_find_aggs';

const TOP_HITS_REASON = 'Invalid aggregation: top_hits aggregations are not supported by this API';
const namespaceReason = (field: string) =>
  `Invalid aggregation: aggregating on [${field}] is not supported by this API`;

describe('getUnsupportedFindAggsReason', () => {
  it('allows missing aggs', () => {
    expect(getUnsupportedFindAggsReason(undefined)).toBeUndefined();
  });

  it('allows aggregations on type attributes and other root fields', () => {
    expect(
      getUnsupportedFindAggsReason({
        by_title: {
          terms: { field: 'dashboard.attributes.title' },
          aggs: { latest: { max: { field: 'dashboard.updated_at' } } },
        },
        by_type: { terms: { field: 'type' } },
      })
    ).toBeUndefined();
  });

  it('allows a type attribute named namespace', () => {
    expect(
      getUnsupportedFindAggsReason({
        by_namespace: { terms: { field: 'ingest-agent-policies.attributes.namespace' } },
      })
    ).toBeUndefined();
  });

  describe('top_hits', () => {
    it('rejects a root level top_hits', () => {
      expect(getUnsupportedFindAggsReason({ hits: { top_hits: { size: 1 } } })).toBe(
        TOP_HITS_REASON
      );
    });

    it.each(['aggs', 'aggregations'])('rejects a top_hits nested under `%s`', (nestedKey) => {
      expect(
        getUnsupportedFindAggsReason({
          by_title: {
            terms: { field: 'dashboard.attributes.title' },
            [nestedKey]: {
              latest: { max: { field: 'dashboard.updated_at' }, aggs: { hits: { top_hits: {} } } },
            },
          },
        })
      ).toBe(TOP_HITS_REASON);
    });

    it('allows an aggregation named top_hits', () => {
      expect(
        getUnsupportedFindAggsReason({
          top_hits: { terms: { field: 'dashboard.attributes.title' } },
        })
      ).toBeUndefined();
    });
  });

  describe('namespace fields', () => {
    it.each(['namespaces', 'namespace', 'dashboard.namespaces', 'dashboard.namespace'])(
      'rejects a terms aggregation on `%s`',
      (field) => {
        expect(getUnsupportedFindAggsReason({ spaces: { terms: { field } } })).toBe(
          namespaceReason(field)
        );
      }
    );

    it('rejects a namespace field in a nested aggregation', () => {
      expect(
        getUnsupportedFindAggsReason({
          by_title: {
            terms: { field: 'dashboard.attributes.title' },
            aggs: { spaces: { cardinality: { field: 'dashboard.namespaces' } } },
          },
        })
      ).toBe(namespaceReason('dashboard.namespaces'));
    });

    it('rejects a namespace field in multi_terms', () => {
      expect(
        getUnsupportedFindAggsReason({
          spaces: {
            multi_terms: {
              terms: [{ field: 'dashboard.attributes.title' }, { field: 'namespaces' }],
            },
          },
        })
      ).toBe(namespaceReason('namespaces'));
    });

    it('rejects a namespace field in composite sources', () => {
      expect(
        getUnsupportedFindAggsReason({
          spaces: {
            composite: { sources: [{ space: { terms: { field: 'dashboard.namespaces' } } }] },
          },
        })
      ).toBe(namespaceReason('dashboard.namespaces'));
    });

    it('rejects a namespace field as a filter term key', () => {
      expect(
        getUnsupportedFindAggsReason({ in_space: { filter: { term: { namespaces: 'secret' } } } })
      ).toBe(namespaceReason('namespaces'));
    });

    it('rejects a namespace field as a range key inside filters', () => {
      expect(
        getUnsupportedFindAggsReason({
          probe: {
            filters: {
              filters: {
                spaces: { bool: { filter: [{ range: { 'dashboard.namespaces': { gte: 'a' } } }] } },
              },
            },
          },
        })
      ).toBe(namespaceReason('dashboard.namespaces'));
    });

    it('rejects a namespace field in an exists filter', () => {
      expect(
        getUnsupportedFindAggsReason({ shared: { filter: { exists: { field: 'namespaces' } } } })
      ).toBe(namespaceReason('namespaces'));
    });
  });
});
