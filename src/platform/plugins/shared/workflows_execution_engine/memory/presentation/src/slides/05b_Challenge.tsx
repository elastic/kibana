import type { FC } from 'react';
import { ContentSlide, Card } from '../components';

export const Challenge: FC = () => (
  <ContentSlide title="Why the Workflow Engine Is Different">
    <p className="text-slide-body text-slide-secondary mb-6">
      Most Kibana features use indexes for append-only or infrequently updated data — logs, alerts, saved objects.
      The workflow engine breaks that mold in ways that constrain which indexing strategies are viable.
    </p>
    <div className="grid grid-cols-2 gap-4">
      <Card variant="warn" title="Mutable execution state">
        Workflow and step executions change status multiple times during their lifecycle.
        Steps transition through pending → running → completed/failed, and orchestrating steps
        manage evolving internal state. We need full <code className="text-elastic-blue">update</code> and{' '}
        <code className="text-elastic-blue">doc_as_upsert</code> support.
      </Card>
      <Card variant="warn" title="Hot-path performance">
        The execution engine reads and writes on every step transition.
        Lookups must be fast and real-time — not subject to refresh intervals or
        cross-index fan-out. Milliseconds matter on the execution loop.
      </Card>
      <Card variant="info" title="Bulk reads by execution">
        A single workflow execution can spawn hundreds of step documents.
        The engine must retrieve all steps for an execution in one{' '}
        <code className="text-elastic-blue">mget</code> call against a known index —
        not a search query.
      </Card>
      <Card variant="info" title="Unbounded growth over time">
        Execution data accumulates indefinitely. Without lifecycle management,
        query performance degrades and storage costs grow unchecked —
        but any solution must preserve mutability for active executions.
      </Card>
    </div>
  </ContentSlide>
);
