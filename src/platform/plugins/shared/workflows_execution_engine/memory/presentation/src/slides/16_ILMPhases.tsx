import type { FC } from 'react';
import { ContentSlide, SlideTable, Card } from '../components';

const headers = ['Phase', 'Contents', 'Access Pattern', 'Actions'];

const rows = [
  ['Hot', 'Active writes, recent executions', 'Frequent reads & writes', 'Rollover (max_age: 1d)'],
  ['Warm', 'Rolled-over, settling', 'Read-only, moderate frequency', 'Forcemerge + Shrink'],
  ['Cold', 'Aged executions', 'Infrequent reads (auditing)', '—'],
  ['Delete', 'Past retention (~30d)', 'Removed entirely', 'Delete'],
];

export const ILMPhases: FC = () => (
  <ContentSlide title="ILM Lifecycle Phases">
    <SlideTable headers={headers} rows={rows} />
    <div className="grid grid-cols-2 gap-3 mt-2">
      <Card variant="info">
        <p className="text-slide-body text-slide-secondary">
          <strong>ILM fully controls</strong> all phase transitions — no application-driven task needed.
          Workflow and step executions share the same ILM policy.
        </p>
      </Card>
      <Card variant="info">
        <p className="text-slide-body text-slide-secondary">
          <strong>Long-running executions</strong> that span beyond the hot phase are fine — hot/warm/cold
          all accept updates when writing to a specific backing index by name.
        </p>
      </Card>
    </div>
    <p className="text-slide-sm text-slide-muted mt-3">
      Future: users may configure cold-phase retention. Hot/warm phases are controlled by us.
    </p>
  </ContentSlide>
);
