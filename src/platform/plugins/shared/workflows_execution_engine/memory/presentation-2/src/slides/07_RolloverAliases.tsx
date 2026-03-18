import type { FC } from 'react';
import { ContentSlide } from '../components';

const IndexBox: FC<{ name: string; label: string; variant: 'old' | 'active' | 'write' }> = ({ name, label, variant }) => {
  const colors = {
    old: 'border-slide-border bg-slide-light text-slide-secondary',
    active: 'border-elastic-blue/40 bg-blue-50/50 text-elastic-blue',
    write: 'border-elastic-teal bg-teal-50 text-emerald-700',
  };
  return (
    <div className={`border-2 rounded-lg p-3 text-center ${colors[variant]}`}>
      <div className="font-mono text-sm font-semibold">{name}</div>
      <div className="text-xs mt-1 opacity-75">{label}</div>
    </div>
  );
};

export const RolloverAliases: FC = () => (
  <ContentSlide title="How Rollover Aliases Work">
    <div className="border-2 border-elastic-blue rounded-xl p-6 bg-white">
      <div className="text-center mb-4">
        <span className="font-mono text-slide-h3 text-elastic-blue">
          Alias: .workflows-executions
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <IndexBox name="-000001" label="All terminal → warm phase" variant="old" />
        <IndexBox name="-000002" label="Some active → stays hot" variant="active" />
        <IndexBox name="-000003" label="Write index ← new executions" variant="write" />
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-slide-secondary">
        <span className="px-3 py-1 rounded bg-slide-light font-medium">
          ILM: rollover on max_age (default: 1d)
        </span>
        <span className="text-slide-muted">·</span>
        <span className="text-slide-muted">~30 backing indexes per month</span>
      </div>
    </div>

    <p className="text-slide-sm text-slide-muted mt-4">
      We could also add a <code className="text-xs">max_docs</code> threshold — performance tests needed to confirm if necessary.
    </p>
  </ContentSlide>
);
