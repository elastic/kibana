import type { FC } from 'react';
import { ContentSlide, TwoColumns, FlowDiagram, BulletList } from '../components';

export const Migration: FC = () => (
  <ContentSlide title="Automated Migration & Cleanup">
    <TwoColumns
      left={
        <div>
          <p className="text-slide-sm text-slide-muted font-medium uppercase tracking-wider mb-3">Lifecycle timeline</p>
          <FlowDiagram steps={[
            { label: 'T = 0', variant: 'caller' },
            { label: '1× interval → Migrate', variant: 'system' },
            { label: '2× interval → Cleanup', variant: 'result' },
          ]} />
          <div className="mt-4 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200">
            <p className="text-slide-sm text-emerald-700 font-medium">
              2x multiplier between migrate and cleanup is a hardcoded safety invariant.
            </p>
          </div>
        </div>
      }
      right={
        <BulletList items={[
          <span><strong>Single Task Manager task</strong> — runs on configurable interval (default: daily)</span>,
          <span><strong>Migrate:</strong> reindex terminal executions older than 1× interval to data streams</span>,
          <span><strong>Cleanup:</strong> delete from state index after 2× interval</span>,
          <span><strong>Idempotent:</strong> <code className="text-elastic-blue text-xs">op_type: create</code> + <code className="text-elastic-blue text-xs">conflicts: proceed</code></span>,
          <span><strong>Safe:</strong> only deletes when ALL docs in a workflow run are terminal</span>,
        ]} />
      }
    />
  </ContentSlide>
);
