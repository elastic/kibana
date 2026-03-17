import type { FC } from 'react';
import { ContentSlide, TwoColumns, BulletList } from '../components';

const getByIdBullets = [
  'Decode encoded execution ID → extract backing index suffix',
  'Direct esClient.mget() on the specific backing index',
  'O(1), real-time, no refresh interval dependency',
  'Hot path for cancel polling and status checks',
];

const searchBullets = [
  'Query the alias → fans out across all backing indexes',
  'Transparent: no application-level coordination needed',
  'Indexes in later phases (cold) may have higher read latency',
  'UI may need query timeouts for old history queries',
];

export const ReadsViaUI: FC = () => (
  <ContentSlide title="Retrieve Documents via UI">
    <p className="text-slide-body text-slide-secondary mb-4">
      The UI has different access patterns than the engine — it needs both real-time polling for active executions and historical search across all data.
      Each pattern maps to a different read strategy optimized for its use case.
    </p>
    <TwoColumns
      left={
        <div>
          <h3 className="text-slide-h3 mb-3">Get by ID (UI polling)</h3>
          <BulletList items={getByIdBullets} />
        </div>
      }
      right={
        <div>
          <h3 className="text-slide-h3 mb-3">Search (execution history)</h3>
          <BulletList items={searchBullets} />
        </div>
      }
    />
  </ContentSlide>
);
