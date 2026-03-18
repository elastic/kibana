import type { FC } from 'react';
import { ContentSlide, TwoColumns, Card, BulletList } from '../components';

export const WhyNotDataStreams: FC = () => (
  <ContentSlide title="Why Not Data Streams for Everything?">
    <TwoColumns
      left={
        <Card variant="warn" title="Data Stream Constraints">
          <ul className="space-y-2 text-slide-body text-slide-secondary mt-2">
            <li className="flex items-start gap-2">
              <span className="text-elastic-pink font-bold shrink-0">✗</span>
              <span>Append-only — no updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-elastic-pink font-bold shrink-0">✗</span>
              <span>No deletes by document ID</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-elastic-pink font-bold shrink-0">✗</span>
              <span>No <code className="text-elastic-blue">mget</code> support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-elastic-pink font-bold shrink-0">✗</span>
              <span>Rollover is index-scoped, not document-scoped</span>
            </li>
          </ul>
        </Card>
      }
      right={
        <BulletList items={[
          <span><strong>Steps mutate multiple times</strong> — pending → running → completed/failed. Orchestrating steps (if, foreach, sub-workflows) emit even more transitions.</span>,
          <span><strong>mget is essential</strong> — loads full execution tree in O(1), always returns latest version, not subject to refresh interval.</span>,
          <span><strong>Without mget: correctness risk</strong> — search queries are subject to 1s refresh interval, causing stale state reads during rapid step transitions.</span>,
        ]} />
      }
    />
  </ContentSlide>
);
