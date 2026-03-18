import type { FC } from 'react';
import { ContentSlide, SlideTable } from '../components';

export const ConflictingPatterns: FC = () => (
  <ContentSlide title="Conflicting Access Patterns">
    <SlideTable
      headers={['', 'Active Executions', 'Historical Executions']}
      rows={[
        [
          <strong>Mutability</strong>,
          'Mutable — update, delete, upsert',
          'Immutable — write-once',
        ],
        [
          <strong>Read pattern</strong>,
          <span><code className="text-elastic-blue">mget</code> by known IDs (O(1))</span>,
          'Search queries with filters, pagination',
        ],
        [
          <strong>Latency</strong>,
          'Sub-millisecond — on hot execution path',
          'Tolerant — reporting, debugging, auditing',
        ],
        [
          <strong>Refresh sensitivity</strong>,
          <span>Critical — stale reads break correctness</span>,
          'Tolerant — eventual consistency is fine',
        ],
        [
          <strong>Volume</strong>,
          'Small — only running workflows',
          'Large — grows unbounded over time',
        ],
        [
          <strong>Lifecycle</strong>,
          'Short-lived — seconds to hours',
          'Long-lived — days, months, years',
        ],
      ]}
    />
  </ContentSlide>
);
