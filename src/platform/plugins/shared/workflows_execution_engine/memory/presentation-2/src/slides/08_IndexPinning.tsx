import type { FC } from 'react';
import { ContentSlide, TwoColumns, FlowDiagram, BulletList } from '../components';

export const IndexPinning: FC = () => (
  <ContentSlide title="Pin Executions to Backing Indexes">
    <TwoColumns
      left={
        <div>
          <p className="text-slide-sm font-semibold text-slide-text mb-3">Pinning flow</p>
          <FlowDiagram steps={[
            { label: 'Workflow starts', variant: 'caller' },
            { label: 'Resolve write index', variant: 'system' },
          ]} />
          <div className="mt-2" />
          <FlowDiagram steps={[
            { label: 'Store pinned index', variant: 'system' },
            { label: 'All writes → pinned', variant: 'result' },
          ]} />
          <div className="mt-4 p-3 rounded-lg bg-slide-light border border-slide-border">
            <p className="text-xs text-slide-secondary">
              Pinned fields on the execution document:
            </p>
            <p className="font-mono text-xs text-elastic-blue mt-1">
              executionsIndex: &quot;.workflows-executions-000003&quot;
            </p>
            <p className="font-mono text-xs text-elastic-blue">
              stepExecutionsIndex: &quot;.workflows-step-executions-000003&quot;
            </p>
          </div>
        </div>
      }
      right={
        <BulletList items={[
          <span>Write index resolved <strong>once</strong> when execution begins</span>,
          <span>All documents for one execution live in the <strong>same</strong> backing index</span>,
          'Even if ILM rolls over mid-execution, updates continue targeting the pinned index',
          <span><strong>Race-free:</strong> resolved from alias metadata via <code>indices.getAlias</code></span>,
        ]} />
      }
    />
  </ContentSlide>
);
