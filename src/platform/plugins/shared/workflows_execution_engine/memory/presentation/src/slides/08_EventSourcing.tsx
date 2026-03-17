import type { FC } from 'react';
import { ContentSlide, Card } from '../components';

export const EventSourcing: FC = () => (
  <ContentSlide title="Why Not Event Sourcing?">
    <div className="space-y-4">
      <Card variant="info" title="Unbounded Events per Execution">
        <p className="text-slide-body text-slide-secondary">
          Orchestrating steps (if, foreach, sub-workflows) emit many state transitions. The number of events per
          execution is unpredictable and potentially large.
        </p>
      </Card>
      <Card variant="info" title="Consumers Need Objects, Not Streams">
        <p className="text-slide-body text-slide-secondary">
          UI, APIs, and internal consumers expect materialized execution objects. Replaying events adds latency and
          makes pagination and filtering significantly harder.
        </p>
      </Card>
      <Card variant="info" title="Runtime State Must Be Fast">
        <p className="text-slide-body text-slide-secondary">
          The execution loop reads and writes state on every step transition. Replaying an event log on each read is
          not viable at the frequency the execution engine operates.
        </p>
      </Card>
    </div>
  </ContentSlide>
);
