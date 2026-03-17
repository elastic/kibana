import type { FC } from 'react';
import { ContentSlide, TwoColumns, BulletList } from '../components';

const bullets = [
  'One index per entity type (workflows, steps)',
  'Both active and historical data mixed together',
  'Hardcoded index names, no aliases',
  'No lifecycle management of any kind',
  'Unbounded growth over time',
];

export const CurrentState: FC = () => (
  <ContentSlide title="Current State: Two Flat Indexes">
    <TwoColumns
      left={
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border-2 border-slide-border p-5 text-center">
            <span className="text-slide-h3 text-slide-text">.workflows-executions</span>
          </div>
          <div className="rounded-lg border-2 border-slide-border p-5 text-center">
            <span className="text-slide-h3 text-slide-text">.workflows-step-executions</span>
          </div>
        </div>
      }
      right={<BulletList items={bullets} />}
    />
  </ContentSlide>
);
