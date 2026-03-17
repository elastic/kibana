import type { FC } from 'react';
import { ContentSlide, BulletList } from '../components';

const items = [
  'Still upsert documents when steps transition state — same write pattern as today',
  'Same separate indexes for workflow and step executions',
  'The change is only in how indexes are managed underneath — ILM + rollover aliases instead of flat indexes',
];

export const NothingChanges: FC = () => (
  <ContentSlide title="Nothing Changes in the Execution Flow" centered>
    <BulletList items={items} />
    <p className="mt-6 text-lg font-semibold text-elastic-blue">
      The execution engine's write patterns are unchanged; only the index infrastructure evolves.
    </p>
  </ContentSlide>
);
