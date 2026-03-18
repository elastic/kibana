import type { FC } from 'react';
import { ContentSlide, BulletList, Card } from '../components';

export const WhyNotEventSourcing: FC = () => (
  <ContentSlide title="Why Not Event Sourcing?">
    <BulletList items={[
      <span><strong>Unbounded events per execution</strong> — simple steps emit 2 events, but foreach loops, retry blocks, and sub-workflows can emit many state transitions. Event count per execution is unpredictable.</span>,
      <span><strong>Consumers need objects, not event streams</strong> — the UI, APIs, and internal consumers expect materialized execution objects (current status, timestamps, outputs). Event sourcing requires replaying events on every read.</span>,
      <span><strong>Runtime state must be fast and bounded</strong> — the execution loop reads and writes state on every step transition. Replaying an event log on each read is not viable at the frequency the engine operates.</span>,
    ]} />
    <Card variant="info" className="mt-6">
      <p className="text-slide-body text-slide-secondary">
        <strong>Bottom line:</strong> Event sourcing trades simplicity at write-time for complexity
        at read-time — the wrong trade for a high-frequency execution loop that reads state
        on every step transition.
      </p>
    </Card>
  </ContentSlide>
);
