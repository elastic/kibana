import type { FC } from 'react';
import { ContentSlide, FlowDiagram, BulletList } from '../components';

const workflowFlow = [
  { label: '.workflows-executions (flat)', variant: 'caller' as const },
  { label: 'Reindex', variant: 'system' as const },
  { label: 'Rollover alias', variant: 'result' as const },
];

const stepFlow = [
  { label: '.workflows-step-executions (flat)', variant: 'caller' as const },
  { label: 'Reindex', variant: 'system' as const },
  { label: 'Rollover alias', variant: 'result' as const },
];

const bullets = [
  'Reindex from current flat indexes into the new rollover aliases',
  'Done for both workflow executions and step executions',
  'After reindex, rename flat indexes to -legacy (not delete) for rollback safety',
  'Straightforward one-time migration on upgrade',
];

export const Migration: FC = () => (
  <ContentSlide title="Migration from Flat Indexes">
    <p className="text-slide-body text-slide-secondary mb-4">
      Existing deployments already have execution data in flat indexes. We need a one-time migration to move that data
      into the new rollover aliases so all executions — past and future — benefit from ILM lifecycle management.
    </p>
    <div className="space-y-3 mb-6">
      <FlowDiagram steps={workflowFlow} />
      <FlowDiagram steps={stepFlow} />
    </div>
    <BulletList items={bullets} />
  </ContentSlide>
);
