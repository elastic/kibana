import React from 'react';

type BoxVariant = 'caller' | 'system' | 'result' | 'current';

interface FlowStep {
  label: string;
  variant: BoxVariant;
}

interface FlowDiagramProps {
  steps: FlowStep[];
}

const variantClasses: Record<BoxVariant, string> = {
  caller: 'bg-blue-50 text-elastic-blue border border-blue-200',
  system: 'bg-teal-50 text-emerald-700 border border-teal-200',
  result: 'bg-teal-50 text-emerald-700 border border-teal-200',
  current: 'bg-pink-50 text-elastic-pink border border-pink-200 border-dashed',
};

export const FlowDiagram: React.FC<FlowDiagramProps> = ({ steps }) => (
  <div className="flex items-center gap-2.5 flex-wrap py-1.5">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="text-slide-muted text-xl">&rarr;</span>}
        <span className={`px-3.5 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${variantClasses[step.variant]}`}>
          {step.label}
        </span>
      </React.Fragment>
    ))}
  </div>
);
