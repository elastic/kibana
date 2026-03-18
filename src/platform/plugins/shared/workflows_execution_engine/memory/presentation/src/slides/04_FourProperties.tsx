import type { FC } from 'react';
import { ContentSlide, TwoColumns, SlideTable, Card, Badge } from '../components';

export const FourProperties: FC = () => (
  <ContentSlide title="Four Properties No Other Plugin Combines">
    <TwoColumns
      left={
        <SlideTable
          headers={['System', 'Mutable', 'Long-Running', 'High Volume', 'History']}
          rows={[
            [
              <strong>Task Manager</strong>,
              <Badge variant="green">Yes</Badge>,
              <Badge variant="green">Yes</Badge>,
              <Badge variant="default">Low</Badge>,
              <span className="text-elastic-pink font-medium">No — deletes completed</span>,
            ],
            [
              <strong>Event Log / Alerting</strong>,
              <span className="text-elastic-pink font-medium">No — append-only</span>,
              <Badge variant="default">No</Badge>,
              <Badge variant="green">Yes</Badge>,
              <Badge variant="green">Yes</Badge>,
            ],
            [
              <strong className="text-elastic-blue">Workflow Engine</strong>,
              <Badge variant="green">Yes</Badge>,
              <Badge variant="green">Yes</Badge>,
              <Badge variant="green">Yes</Badge>,
              <Badge variant="green">Yes</Badge>,
            ],
          ]}
        />
      }
      right={
        <Card variant="info" title="External Analogies">
          <p className="text-slide-body text-slide-secondary">
            The closest systems that solve this same combination are{' '}
            <strong>Temporal.io</strong> and <strong>AWS Step Functions</strong> — both use
            a similar tiered separation of active execution state from execution history.
          </p>
        </Card>
      }
    />
  </ContentSlide>
);
