import type { FC } from 'react';
import { ContentSlide, SlideTable, Card } from '../components';

export const ILMPhases: FC = () => (
  <ContentSlide title="ILM Lifecycle Phases">
    <SlideTable
      headers={['Phase', 'Contents', 'Access Pattern', 'Actions']}
      rows={[
        ['Hot', 'Active writes, recent executions', 'Frequent reads/writes', <code>rollover (max_age: 1d)</code>],
        ['Warm', 'Rolled-over, settling', 'Read-only, moderate', <code>forcemerge + shrink</code>],
        ['Cold', 'Aged executions', 'Infrequent reads', '—'],
        ['Delete', 'Past retention (~30d)', 'Removed', <code>delete</code>],
      ]}
    />

    <Card variant="warn" className="mt-4">
      <p className="text-slide-sm text-slide-secondary">
        <strong>Note:</strong> The specific phases, thresholds, and actions shown here are a <strong>raw assumption</strong> — a reasonable starting point, not a final decision. The actual ILM policy will be decided later by the product team.
      </p>
    </Card>

    <p className="text-slide-sm text-slide-muted mt-3">
      Long-running executions are fine — hot/warm/cold all accept writes when targeting a specific backing index by name.
    </p>
  </ContentSlide>
);
