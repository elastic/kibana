import type { FC } from 'react';
import { ContentSlide, Badge } from '../components';

export const HowRollover: FC = () => (
  <ContentSlide title="How Rollover Aliases Work">
    <p className="text-slide-body text-slide-secondary mb-4">
      Without rollover, our indexes grow without bound — degrading query performance and preventing lifecycle management.
      Rollover aliases let Elasticsearch automatically split data into manageable, time-bounded backing indexes.
    </p>
    <div className="border-2 border-elastic-blue/30 rounded-xl p-6 bg-blue-50/30">
      <p className="text-sm font-medium text-slide-secondary mb-4">Alias: .workflows-executions</p>
      <div className="flex gap-4">
        <div className="border border-slide-border rounded-lg p-4 bg-white text-center flex-1">
          <p className="font-semibold text-slide-text">-000001 (old)</p>
          <p className="text-sm text-slide-secondary mt-1">Rolled over, settling</p>
          <div className="mt-2">
            <Badge variant="green">Warm phase</Badge>
          </div>
        </div>
        <div className="border border-slide-border rounded-lg p-4 bg-white text-center flex-1">
          <p className="font-semibold text-slide-text">-000002 (old)</p>
          <p className="text-sm text-slide-secondary mt-1">Mixed: some active</p>
          <div className="mt-2">
            <Badge variant="default">Hot phase</Badge>
          </div>
        </div>
        <div className="border border-slide-border rounded-lg p-4 bg-white text-center flex-1">
          <p className="font-semibold text-slide-text">-000003</p>
          <p className="text-sm text-slide-secondary mt-1">Current write index</p>
          <div className="mt-2">
            <Badge variant="blue">Write index</Badge>
          </div>
        </div>
      </div>
    </div>
    <p className="text-slide-sm text-slide-secondary mt-4">
      ILM rolls over based on <code className="text-elastic-blue">max_age</code> (default: 1 day).
      A <code className="text-elastic-blue">max_docs</code> threshold can also be added — performance tests needed to confirm.
      Rough estimate: <strong>~30 backing indexes per month</strong>.
    </p>
  </ContentSlide>
);
