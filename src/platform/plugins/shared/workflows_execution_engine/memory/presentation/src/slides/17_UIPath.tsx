import type { FC } from 'react';
import { ContentSlide, Card } from '../components';

export const UIPath: FC = () => (
  <ContentSlide title="UI Path — Reading Across Both Tiers">
    <div className="grid grid-cols-1 gap-4">
      <Card variant="info" title="Get Workflow by ID — Waterfall">
        <p className="text-slide-sm text-slide-secondary">
          <code className="text-elastic-blue">mget</code> from state index first (O(1), always fresh).
          Falls back to history data stream search <strong>only</strong> if the execution has already been migrated.
          Zero overhead for active and recently-completed executions.
        </p>
      </Card>

      <Card variant="info" title="Get Steps for a Workflow — Fan-out">
        <p className="text-slide-sm text-slide-secondary">
          <code className="text-elastic-blue">mget</code> workflow doc &rarr; read{' '}
          <code className="text-elastic-blue">stepExecutionIds</code> manifest &rarr;{' '}
          <code className="text-elastic-blue">mget</code> all steps in one call.
          Falls back to history search if workflow already migrated.
        </p>
      </Card>

      <Card variant="info" title="Search / List Executions — Parallel Multi-Index">
        <p className="text-slide-sm text-slide-secondary">
          Single ES search spanning <strong>both</strong> state index + history data stream.
          Uses <code className="text-elastic-blue">collapse</code> on{' '}
          <code className="text-elastic-blue">id</code> field to dedup during the overlap window
          (between migration and cleanup).
        </p>
      </Card>
    </div>
  </ContentSlide>
);
