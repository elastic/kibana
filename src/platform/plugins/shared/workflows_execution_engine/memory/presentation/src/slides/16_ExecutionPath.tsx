import type { FC } from 'react';
import { ContentSlide, TwoColumns, FlowDiagram, BulletList } from '../components';

export const ExecutionPath: FC = () => (
  <ContentSlide title="Execution Path — Engine Reads & Writes">
    <TwoColumns
      left={
        <div>
          <p className="text-slide-sm text-slide-muted font-medium uppercase tracking-wider mb-3">Execution loop cycle</p>
          <FlowDiagram steps={[
            { label: 'Read (mget)', variant: 'caller' },
            { label: 'Run Step', variant: 'system' },
            { label: 'Flush (bulkUpsert)', variant: 'result' },
          ]} />
          <div className="mt-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-slide-sm text-elastic-blue font-medium">
              Targets execution state index only — data streams are never involved.
            </p>
          </div>
        </div>
      }
      right={
        <BulletList items={[
          <span><strong>Resume:</strong> <code className="text-elastic-blue text-xs">mget(workflowId + stepExecutionIds)</code> — full state in 1 call</span>,
          <span><strong>Flush:</strong> <code className="text-elastic-blue text-xs">bulkUpsert</code> writes workflow + all step updates in a single bulk call</span>,
          <span><strong>Concurrency checks:</strong> query execution state index only</span>,
          <span><strong>Cancellation polling:</strong> query execution state index only</span>,
          <span><strong>Zero refresh dependency:</strong> <code className="text-elastic-blue text-xs">mget</code> always returns the latest written version</span>,
        ]} />
      }
    />
  </ContentSlide>
);
