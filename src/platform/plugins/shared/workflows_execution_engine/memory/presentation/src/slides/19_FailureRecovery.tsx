import type { FC } from 'react';
import { ContentSlide, BulletList, Card } from '../components';

export const FailureRecovery: FC = () => (
  <ContentSlide title="Failure Recovery & Safety">
    <BulletList items={[
      <span><strong>Reindex is idempotent</strong> — re-running migration for already-migrated documents is a no-op. Interrupted tasks simply skip existing docs on retry.</span>,
      <span><strong>Cleanup is independent</strong> — cleanup threshold (2×) is always larger than migration threshold (1×). Even if migration fails for a cycle, cleanup won't delete un-migrated data.</span>,
      <span><strong>No transactional coupling</strong> — migration and cleanup are separate operations. If one succeeds and the other fails, the system remains consistent — data may temporarily exist in both tiers, handled by dedup.</span>,
      <span><strong>Single-node execution</strong> — Task Manager guarantees only one Kibana instance runs the migration task at a time across the cluster.</span>,
      <span><strong>Space isolation preserved</strong> — all operations filter by <code className="text-elastic-blue">spaceId</code>. Reindex copies documents as-is, including their space context.</span>,
    ]} />

    <Card className="mt-4">
      <p className="text-slide-body text-slide-secondary">
        <strong>Single configuration knob:</strong> <code className="text-elastic-blue">lifecycleInterval</code> (default: 1d)
        controls task frequency, migration threshold (1×), and cleanup threshold (2×).
        No risk of misconfiguration.
      </p>
    </Card>
  </ContentSlide>
);
