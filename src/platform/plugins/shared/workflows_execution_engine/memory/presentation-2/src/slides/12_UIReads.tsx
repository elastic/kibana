import type { FC } from 'react';
import { ContentSlide, TwoColumns, BulletList } from '../components';

export const UIReads: FC = () => (
  <ContentSlide title="Retrieve Documents via UI">
    <TwoColumns
      left={
        <div>
          <h3 className="text-slide-h3 text-slide-text mb-3">Get by ID (UI polling)</h3>
          <BulletList items={[
            'Decode encoded ID → extract backing index suffix',
            <span>Direct <code>esClient.get()</code> on specific backing index</span>,
            <span><strong>O(1)</strong>, real-time, no refresh interval dependency</span>,
          ]} />
        </div>
      }
      right={
        <div>
          <h3 className="text-slide-h3 text-slide-text mb-3">Search (execution history)</h3>
          <BulletList items={[
            'Query the alias → fans out across all backing indexes',
            'Transparent: no application-level coordination',
            'Later-phase indexes (cold) may have higher read latency',
          ]} />
        </div>
      }
    />
    <p className="text-slide-sm text-slide-muted mt-4 italic">
      UI polling uses direct GET for speed; history browsing uses alias fan-out for completeness.
    </p>
  </ContentSlide>
);
