import type { FC } from 'react';
import { ContentSlide, FlowDiagram, TwoColumns, Card } from '../components';

export const TwoTierOverview: FC = () => (
  <ContentSlide title="Two-Tier Architecture Overview">
    <FlowDiagram steps={[
      { label: 'Execution State', variant: 'caller' },
      { label: 'Scheduled Migration', variant: 'system' },
      { label: 'Execution History', variant: 'result' },
    ]} />

    <TwoColumns
      gap="gap-6"
      left={
        <Card variant="info" title="Execution State (Command Side)">
          <ul className="space-y-1.5 text-slide-sm text-slide-secondary mt-1">
            <li>Regular ES index — <strong>mutable</strong></li>
            <li>Supports <code className="text-elastic-blue">mget</code>, updates, deletes, upserts</li>
            <li>Used by: execution loop, concurrency manager, cancellation polling</li>
            <li>Small — only active + recently completed</li>
          </ul>
        </Card>
      }
      right={
        <Card variant="success" title="Execution History (Query Side)">
          <ul className="space-y-1.5 text-slide-sm text-slide-secondary mt-1">
            <li>Data streams — <strong>append-only</strong></li>
            <li>ILM-managed retention and rollover</li>
            <li>Used by: search, get-by-id fallback, reporting, auditing</li>
            <li>Scales with time-series optimizations</li>
          </ul>
        </Card>
      }
    />
  </ContentSlide>
);
