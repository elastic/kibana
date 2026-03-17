import type { FC } from 'react';
import { ContentSlide, TwoColumns, BulletList } from '../components';

const leftItems = [
  'Append-only, time-series optimized',
  'Native ILM support out of the box',
  'Automatic rollover and retention',
  'Ideal for immutable event data',
];

const rightItems = [
  'No update or delete by document ID',
  'No mget (multi-get) support',
  'Steps change status multiple times during lifecycle',
  'Orchestrating steps manage evolving internal state',
  'Stale reads during rapid step transitions',
];

export const DataStreamsOption: FC = () => (
  <ContentSlide title="Option 1: Data Streams for Everything">
    <TwoColumns
      left={
        <div>
          <h3 className="text-slide-h3 mb-3">What Data Streams Offer</h3>
          <BulletList items={leftItems} />
        </div>
      }
      right={
        <div>
          <h3 className="text-slide-h3 mb-3 text-elastic-pink">Why They Don&apos;t Fit</h3>
          <BulletList items={rightItems} />
        </div>
      }
    />
  </ContentSlide>
);
