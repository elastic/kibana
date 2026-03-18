import type { FC } from 'react';
import { ContentSlide, BulletList, Card } from '../components';

export const NothingChanges: FC = () => (
  <ContentSlide title="Nothing Changes in the Execution Flow">
    <Card variant="success" title="The execution engine's write patterns are unchanged">
      <BulletList items={[
        'Still upsert documents when steps transition state',
        'Same workflow/step index layout (separate indexes for workflows and steps)',
        'The change is only in how indexes are managed underneath — ILM + rollover aliases instead of flat indexes',
      ]} />
    </Card>
    <p className="text-slide-sm text-slide-muted mt-5 italic">
      Only the index infrastructure evolves — the execution loop is untouched.
    </p>
  </ContentSlide>
);
