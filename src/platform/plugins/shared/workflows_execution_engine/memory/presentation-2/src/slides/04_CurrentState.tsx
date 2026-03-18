import type { FC } from 'react';
import { ContentSlide, TwoColumns, BulletList } from '../components';

const DiagramBox: FC<{ label: string; sub: string }> = ({ label, sub }) => (
  <div className="border-2 border-elastic-blue/30 rounded-lg p-4 bg-blue-50/50 text-center mb-3">
    <div className="font-mono text-sm font-semibold text-elastic-blue">{label}</div>
    <div className="text-xs text-slide-secondary mt-1">{sub}</div>
  </div>
);

const LeftDiagram: FC = () => (
  <div>
    <p className="text-slide-sm font-semibold text-slide-text mb-3">Current indexes</p>
    <DiagramBox label=".workflows-executions" sub="All active + historical executions" />
    <DiagramBox label=".workflows-step-executions" sub="All active + historical steps" />
    <p className="text-xs text-slide-muted mt-2 italic">
      Two flat indexes, hardcoded names, no lifecycle
    </p>
  </div>
);

export const CurrentState: FC = () => (
  <ContentSlide title="Current State: Two Flat Indexes">
    <TwoColumns
      left={<LeftDiagram />}
      right={
        <BulletList items={[
          <span><strong>Unbounded growth</strong> — indexes grow indefinitely as completed executions accumulate</span>,
          <span><strong>No lifecycle management</strong> — no ILM, no rollover, no automatic aging</span>,
          <span><strong>Degrading queries</strong> — active-execution queries slow as history accumulates</span>,
          <span><strong>Only cleanup: <code>delete_by_query</code></strong> — creates tombstones, triggers expensive segment merges</span>,
        ]} />
      }
    />
  </ContentSlide>
);
