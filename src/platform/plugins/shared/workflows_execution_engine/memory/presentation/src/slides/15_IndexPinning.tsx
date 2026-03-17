import type { FC } from 'react';
import { ContentSlide, TwoColumns, FlowDiagram, BulletList } from '../components';

const flowSteps = [
  { label: 'Workflow starts', variant: 'caller' as const },
  { label: 'Resolve write index', variant: 'system' as const },
  { label: 'Store pinned index', variant: 'system' as const },
  { label: 'All writes → pinned index', variant: 'result' as const },
];

const bullets = [
  'Write index resolved once at execution creation time',
  'All documents for one execution live in the same backing index',
  'Even if ILM rolls over mid-execution, updates continue targeting the pinned index',
  'Race-free: resolved from alias metadata via indices.getAlias',
  'Stored as executionsIndex and stepExecutionsIndex on workflow document',
];

export const IndexPinning: FC = () => (
  <ContentSlide title="Pin Executions to Backing Indexes">
    <TwoColumns
      left={<FlowDiagram steps={flowSteps} />}
      right={<BulletList items={bullets} />}
    />
  </ContentSlide>
);
