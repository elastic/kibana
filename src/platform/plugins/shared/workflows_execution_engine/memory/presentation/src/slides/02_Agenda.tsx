import type { FC } from 'react';
import { ContentSlide } from '../components';

const items = [
  'Why We\'re Unique — the problem no other Kibana plugin has',
  'The Problem — what happens when one index does everything',
  'Why Obvious Solutions Fail — data streams, event sourcing',
  'CQRS + Tiered Storage — the architecture',
  'How It Works — execution path, UI path, migration',
  'Trade-offs — what we gain, what we pay',
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
