import type { FC } from 'react';
import { ContentSlide, FlowDiagram, Card, BulletList } from '../components';

const flowSteps = [
  { label: 'Execution State Index', variant: 'caller' as const },
  { label: 'Scheduled Migration Task', variant: 'system' as const },
  { label: 'Data Streams (History)', variant: 'result' as const },
];

const bulletItems = [
  'Mutable state index for active executions — supports update, mget, delete',
  'Append-only data streams for completed execution history',
  'Daily Task Manager migration task copies terminal executions',
  'Cleanup deletes migrated data from state index after safety gap',
];

export const CQRSOverview: FC = () => (
  <ContentSlide title="Option 2: CQRS with Tiered Storage">
    <FlowDiagram steps={flowSteps} />
    <Card>
      <BulletList items={bulletItems} />
    </Card>
  </ContentSlide>
);
