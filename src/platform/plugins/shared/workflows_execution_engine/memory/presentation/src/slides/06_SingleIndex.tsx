import type { FC } from 'react';
import { ContentSlide, TwoColumns, FlowDiagram, BulletList } from '../components';

export const SingleIndex: FC = () => (
  <ContentSlide title="Single Index, All the Pain">
    <TwoColumns
      left={
        <div className="space-y-4">
          <p className="text-slide-sm text-slide-muted font-medium uppercase tracking-wider mb-2">Today's architecture</p>
          <FlowDiagram steps={[
            { label: '.workflows-executions', variant: 'current' },
          ]} />
          <FlowDiagram steps={[
            { label: '.workflows-step-executions', variant: 'current' },
          ]} />
          <p className="text-slide-sm text-slide-secondary mt-4">
            Both active <strong>and</strong> historical data in the same index.
            All reads <strong>and</strong> writes hit the same storage.
          </p>
        </div>
      }
      right={
        <BulletList items={[
          <span><strong>Unbounded index growth</strong> — completed executions accumulate forever alongside active ones</span>,
          <span><strong>Query performance degrades</strong> — concurrency checks, cancellation polling slow down as history grows</span>,
          <span><strong>No lifecycle management</strong> — no mechanism to age out old data independently from active state</span>,
          <span><strong>Conflicting access patterns</strong> — active data needs fast mutable ops; historical data is write-once and query-heavy</span>,
        ]} />
      }
    />
  </ContentSlide>
);
