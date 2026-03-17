import type { FC } from 'react';
import { ContentSlide } from '../components';

const items = [
  'The motivation for change',
  'Options considered (and why they were abandoned)',
  'The chosen approach: rollover indexes with ILM',
  'Benefits and open questions',
];

export const Agenda: FC = () => (
  <ContentSlide title="Agenda" centered>
    <ol className="space-y-4 list-none pl-0">
      {items.map((text, i) => (
        <li key={i} className="text-slide-body">
          <span className="font-bold text-elastic-blue">{i + 1}.</span>{' '}
          <span className="text-slide-secondary">{text}</span>
        </li>
      ))}
    </ol>
  </ContentSlide>
);
