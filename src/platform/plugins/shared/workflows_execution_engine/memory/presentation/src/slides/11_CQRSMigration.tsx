import type { FC } from 'react';
import { ContentSlide, Card } from '../components';

export const CQRSMigration: FC = () => (
  <ContentSlide title="CQRS: Migration Overhead">
    <div className="space-y-4">
      <Card variant="info" title="Scheduled Migration Task">
        <p className="text-slide-body text-slide-secondary">
          A Task Manager task must periodically reindex terminal executions from the state index to data streams, then
          clean up after a safety gap.
        </p>
      </Card>
      <Card variant="info" title="Additional Infrastructure">
        <p className="text-slide-body text-slide-secondary">
          Two data streams + state index + migration task = increased operational surface area to monitor and maintain.
        </p>
      </Card>
      <Card variant="info" title="Tuning Required">
        <p className="text-slide-body text-slide-secondary">
          Migration/cleanup thresholds must be balanced. Overlap windows between migration and cleanup introduce
          transient pagination inconsistencies.
        </p>
      </Card>
    </div>
  </ContentSlide>
);
