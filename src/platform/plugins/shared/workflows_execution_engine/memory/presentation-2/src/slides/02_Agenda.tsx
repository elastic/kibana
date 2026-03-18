import type { FC } from 'react';
import { ContentSlide } from '../components';

const items = [
  'Why we need to change (brief recap)',
  'Rollover indexes with ILM: architecture, pinning, encoded IDs',
  'Read/write patterns',
  'ILM lifecycle management',
  'Migration from flat indexes',
  'Open questions & discussion',
];

export const Agenda: FC = () => (
  <ContentSlide title="Agenda" centered>
    <ol className="space-y-4 list-none pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-slide-body text-slide-secondary">
          <span className="text-elastic-blue font-bold text-xl shrink-0">{i + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  </ContentSlide>
);
