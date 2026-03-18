import type { FC } from 'react';
import { ContentSlide, Card } from '../components';

export const MgetEliminatesSearch: FC = () => (
  <ContentSlide title={<>How <code>mget</code> Eliminates Search</>}>
    <div className="grid grid-cols-2 gap-6">
      <Card variant="info" title="Execution Resume">
        <div className="space-y-3 mt-2">
          <div className="flex items-center gap-2 text-slide-sm">
            <span className="px-2.5 py-1 rounded bg-blue-50 text-elastic-blue font-medium text-xs">mget</span>
            <span className="text-slide-muted">&rarr;</span>
            <span className="text-slide-secondary">workflowId + all stepExecutionIds</span>
          </div>
          <p className="text-slide-sm text-slide-secondary">
            Full execution state restored in <strong className="text-elastic-blue">1 call</strong>.
            No search queries. Not subject to refresh interval.
          </p>
        </div>
      </Card>

      <Card variant="info" title="UI Polling">
        <div className="space-y-3 mt-2">
          <div className="flex items-center gap-2 text-slide-sm">
            <span className="px-2.5 py-1 rounded bg-blue-50 text-elastic-blue font-medium text-xs">mget</span>
            <span className="text-slide-muted">&rarr;</span>
            <span className="text-slide-secondary">workflowId</span>
          </div>
          <div className="flex items-center gap-2 text-slide-sm">
            <span className="px-2.5 py-1 rounded bg-blue-50 text-elastic-blue font-medium text-xs">mget</span>
            <span className="text-slide-muted">&rarr;</span>
            <span className="text-slide-secondary">stepExecutionIds from manifest</span>
          </div>
          <p className="text-slide-sm text-slide-secondary">
            Entire execution tree in <strong className="text-elastic-blue">2 calls</strong>,
            regardless of step count.
          </p>
        </div>
      </Card>
    </div>

    <Card className="mt-4">
      <p className="text-slide-body text-slide-secondary">
        <strong>Key insight:</strong> Known IDs + <code className="text-elastic-blue">mget</code> = O(1) state loading,
        immune to refresh interval lag. No component ever needs to <em>search</em> for execution documents.
      </p>
    </Card>
  </ContentSlide>
);
