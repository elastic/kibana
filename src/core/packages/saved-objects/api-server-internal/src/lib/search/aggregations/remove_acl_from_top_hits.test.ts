/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { removeAclFromTopHits } from './remove_acl_from_top_hits';

const hitWithAcl = () => ({
  _id: 'dashboard:1',
  _source: { dashboard: { title: 'Sales' } },
  fields: { 'dashboard.title': ['Sales'], 'acl.owner.id': ['u_owner'], acl: ['x'] },
  highlight: { 'dashboard.title': ['<em>Sales</em>'], 'acl.owner.id': ['<em>u_owner</em>'] },
  sort: [1],
});

const cleanHit = {
  _id: 'dashboard:1',
  _source: { dashboard: { title: 'Sales' } },
  fields: { 'dashboard.title': ['Sales'] },
  highlight: { 'dashboard.title': ['<em>Sales</em>'] },
  sort: [1],
};

const topHits = (hit: object) => ({ hits: { total: { value: 1 }, max_score: 1, hits: [hit] } });

describe('removeAclFromTopHits', () => {
  it('removes ACL keys from a top-level top_hits result', () => {
    expect(removeAclFromTopHits({ top: topHits(hitWithAcl()) })).toEqual({
      top: topHits(cleanHit),
    });
  });

  it('removes ACL keys under terms buckets', () => {
    const response = {
      byType: {
        buckets: [
          { key: 'dashboard', doc_count: 1, top: topHits(hitWithAcl()) },
          { key: 'index-pattern', doc_count: 1, top: topHits(hitWithAcl()) },
        ],
      },
    };
    expect(removeAclFromTopHits(response)).toEqual({
      byType: {
        buckets: [
          { key: 'dashboard', doc_count: 1, top: topHits(cleanHit) },
          { key: 'index-pattern', doc_count: 1, top: topHits(cleanHit) },
        ],
      },
    });
  });

  it('removes ACL keys under keyed filters buckets', () => {
    const response = {
      byFilter: { buckets: { recent: { doc_count: 1, top: topHits(hitWithAcl()) } } },
    };
    expect(removeAclFromTopHits(response)).toEqual({
      byFilter: { buckets: { recent: { doc_count: 1, top: topHits(cleanHit) } } },
    });
  });

  it('removes ACL keys under a single-bucket aggregation', () => {
    const response = {
      recent: { doc_count: 1, nested: { doc_count: 1, top: topHits(hitWithAcl()) } },
    };
    expect(removeAclFromTopHits(response)).toEqual({
      recent: { doc_count: 1, nested: { doc_count: 1, top: topHits(cleanHit) } },
    });
  });

  it('keeps hits without fields or highlight unchanged', () => {
    const hit = { _id: 'dashboard:1', _source: { dashboard: { title: 'Sales' } } };
    expect(removeAclFromTopHits({ top: topHits(hit) })).toEqual({ top: topHits(hit) });
  });

  it('keeps other aggregation results unchanged', () => {
    const response = {
      byType: { buckets: [{ key: 'dashboard', doc_count: 2 }] },
      max: { value: 3 },
    };
    expect(removeAclFromTopHits(response)).toEqual(response);
  });
});
