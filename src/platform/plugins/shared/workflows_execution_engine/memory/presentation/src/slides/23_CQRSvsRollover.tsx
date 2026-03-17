import type { FC } from 'react';
import { ContentSlide, SlideTable } from '../components';

const headers = ['Aspect', 'CQRS (Tiered Storage)', 'Rollover Indexes with ILM'];

const rows = [
  [
    'Write path',
    'Upserts to mutable state index',
    'Upserts to pinned backing index',
  ],
  [
    'Get by ID (execution)',
    'Waterfall: state index → fall back to history',
    'O(1) direct GET via encoded ID',
  ],
  [
    'Get steps (execution)',
    'mget on state index → fall back to search history',
    'mget on pinned backing index',
  ],
  [
    'Search (UI)',
    'Multi-index with field collapsing for dedup',
    'Single alias fan-out, no dedup needed',
  ],
  [
    'Lifecycle management',
    'Scheduled migration task + cleanup',
    'ILM fully automatic',
  ],
  [
    'Data duplication',
    'Overlap window: same doc in both tiers',
    'None',
  ],
  [
    'Infrastructure',
    'State index + 2 data streams + migration task',
    'Alias + backing indexes + ILM policy',
  ],
  [
    'Mutability',
    'State index only; data streams are append-only',
    'All backing indexes support updates',
  ],
  [
    'Complexity',
    'Higher: two-tier queries, dedup, migration tuning',
    'Lower: single alias, encoded IDs',
  ],
];

export const CQRSvsRollover: FC = () => (
  <ContentSlide title="CQRS vs Rollover: Side-by-Side Comparison">
    <SlideTable headers={headers} rows={rows} />
    <p className="mt-4 text-lg font-semibold text-elastic-blue">
      No reindexes — data is already in the right place once ingested.
    </p>
  </ContentSlide>
);
