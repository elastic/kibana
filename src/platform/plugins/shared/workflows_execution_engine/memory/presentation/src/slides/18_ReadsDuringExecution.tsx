import type { FC } from 'react';
import { ContentSlide, TwoColumns, BulletList } from '../components';

const writeBullets = [
  'New executions → write to alias (routes to current write index)',
  'Existing executions → write to pinned backing index from execution document',
  'Bulk upserts for state flushes target pinned index',
  'No cross-index splitting ever occurs',
];

const readBullets = [
  'Get by ID → decode encoded ID, direct GET on specific backing index',
  'O(1), real-time, not subject to refresh interval',
  'Get step executions → mget on pinned index using stepExecutionIds manifest',
  'All step docs live in same backing index due to pinning',
];

export const ReadsDuringExecution: FC = () => (
  <ContentSlide title="Retrieve Documents During Execution">
    <TwoColumns
      left={
        <div>
          <h3 className="text-slide-h3 mb-3">Writes</h3>
          <BulletList items={writeBullets} />
        </div>
      }
      right={
        <div>
          <h3 className="text-slide-h3 mb-3">Reads</h3>
          <BulletList items={readBullets} />
        </div>
      }
    />
  </ContentSlide>
);
