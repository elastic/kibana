import type { FC } from 'react';
import { ContentSlide, TwoColumns, BulletList } from '../components';

export const ExecutionReads: FC = () => (
  <ContentSlide title="Retrieve Documents During Execution">
    <TwoColumns
      left={
        <div>
          <h3 className="text-slide-h3 text-slide-text mb-3">Writes</h3>
          <BulletList items={[
            <span><strong>New executions</strong> → write to alias (routes to write index)</span>,
            <span><strong>Existing executions</strong> → write to pinned backing index</span>,
          ]} />
        </div>
      }
      right={
        <div>
          <h3 className="text-slide-h3 text-slide-text mb-3">Reads</h3>
          <BulletList items={[
            <span><strong>Get by ID</strong> → decode ID, direct GET on backing index (O(1), not subject to refresh interval)</span>,
            <span><strong>Get steps</strong> → <code>mget</code> on pinned index using <code>stepExecutionIds</code> manifest</span>,
            'All step docs live in same backing index due to pinning',
          ]} />
        </div>
      }
    />
    <p className="text-slide-sm text-slide-muted mt-4 italic">
      No search queries on the hot path — the execution engine reads and writes directly to pinned backing indexes.
    </p>
  </ContentSlide>
);
