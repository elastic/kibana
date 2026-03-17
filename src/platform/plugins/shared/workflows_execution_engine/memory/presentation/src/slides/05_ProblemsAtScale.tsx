import type { FC } from 'react';
import { ContentSlide, Card } from '../components';

const cards = [
  {
    title: 'Unbounded Growth',
    content:
      'Indexes grow indefinitely as completed executions accumulate alongside active ones. No mechanism to remove historical data.',
  },
  {
    title: 'No Lifecycle Management',
    content:
      'No ILM policy, no rollover, no automatic aging. There is no built-in mechanism to remove or age historical data.',
  },
  {
    title: 'Degrading Query Performance',
    content:
      'Active-execution queries (concurrency checks, cancellation polling) slow down as historical data accumulates in the same index.',
  },
];

export const ProblemsAtScale: FC = () => (
  <ContentSlide title="Problems at Scale">
    <div className="grid grid-cols-2 gap-4">
      {cards.map(({ title, content }) => (
        <Card key={title} variant="warn" title={title}>
          <p className="text-slide-body text-slide-secondary">{content}</p>
        </Card>
      ))}
    </div>
  </ContentSlide>
);
