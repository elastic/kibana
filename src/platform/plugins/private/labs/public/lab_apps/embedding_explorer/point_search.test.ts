/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findPointSearchMatches } from './point_search';

describe('point search', () => {
  const points = [
    {
      id: 'story-1',
      x: 0.1,
      y: 0.2,
      label: 'Vector search ranking issue',
      summary: 'Observability alerts were grouped incorrectly after a vector scoring change.',
      category: 'story',
      source: 'hackernews',
      metadata: {
        author: 'alice',
        service: 'search',
      },
    },
    {
      id: 'comment-1',
      x: 0.4,
      y: 0.3,
      label: 'Alerting follow up',
      summary: 'Comment discussing search ranking regressions in observability dashboards.',
      category: 'comment',
      source: 'hackernews',
      metadata: {
        author: 'bob',
        service: 'observability',
      },
    },
    {
      id: 'job-1',
      x: 0.8,
      y: 0.7,
      label: 'Backend engineer role',
      summary: 'Hiring for a platform team.',
      category: 'job',
      source: 'careers',
      metadata: {
        author: 'carol',
        service: 'platform',
      },
    },
  ] as const;

  it('returns matching points sorted by relevance', () => {
    expect(findPointSearchMatches(points, 'observability').map((match) => match.pointId)).toEqual([
      'story-1',
      'comment-1',
    ]);
  });

  it('matches across multiple query terms', () => {
    expect(findPointSearchMatches(points, 'search alice').map((match) => match.pointId)).toEqual([
      'story-1',
    ]);
  });

  it('supports fuzzy subsequence matching inside words', () => {
    expect(findPointSearchMatches(points, 'obsrv').map((match) => match.pointId)).toEqual([
      'comment-1',
      'story-1',
    ]);
  });

  it('returns an empty result for blank or unmatched queries', () => {
    expect(findPointSearchMatches(points, '   ')).toEqual([]);
    expect(findPointSearchMatches(points, 'security')).toEqual([]);
  });
});
