import type { FC } from 'react';
import { ContentSlide, SlideTable } from '../components';

const headers = ['Concern', 'CQRS Approach', 'Rollover Aliases'];

const rows = [
  ['Query complexity', 'Two-tier with dedup + collapsing', 'Single alias fan-out'],
  ['Migration task', 'Required (reindex + cleanup)', 'Not needed'],
  ['Dedup logic', 'Field collapsing, waterfall fallback', 'None'],
  ['Mutability', 'Only in state index', 'All backing indexes'],
  ['Infrastructure', '3+ components to manage', 'ILM policy + alias'],
];

export const WhyNotCQRS: FC = () => (
  <ContentSlide title="Why We Moved Past CQRS">
    <SlideTable headers={headers} rows={rows} />
  </ContentSlide>
);
