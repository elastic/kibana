import type { FC } from 'react';
import { ContentSlide, TwoColumns, BulletList, Card } from '../components';

export const UnifiedState: FC = () => (
  <ContentSlide title="Unified Execution State Index">
    <TwoColumns
      left={
        <BulletList items={[
          <span><strong>Workflows & steps in one index</strong> — same lifecycle, same fields, distinguished by a <code className="text-elastic-blue">type</code> field</span>,
          <span><strong>Single <code className="text-elastic-blue">bulkUpsert</code></strong> for all state flushes — workflow + step updates in one bulk call</span>,
          <span><strong>Single <code className="text-elastic-blue">deleteByQuery</code></strong> for cleanup — no cross-index coordination</span>,
          <span><strong>All reads via <code className="text-elastic-blue">mget</code></strong> with known IDs — no search queries needed</span>,
        ]} />
      }
      right={
        <Card variant="info" title="Deterministic ID Scheme">
          <ul className="space-y-2 text-slide-sm text-slide-secondary mt-2">
            <li>
              <strong className="text-slide-text">Workflow ID:</strong>{' '}
              UUID v4 — generated at creation, known by all callers
            </li>
            <li>
              <strong className="text-slide-text">Step ID:</strong>{' '}
              SHA-256 of <code className="text-elastic-blue text-xs">executionId_scopePath_stepId</code>
            </li>
            <li>
              <strong className="text-slide-text">Manifest:</strong>{' '}
              <code className="text-elastic-blue text-xs">stepExecutionIds[]</code> on workflow doc — single source of truth
            </li>
          </ul>
        </Card>
      }
    />
  </ContentSlide>
);
