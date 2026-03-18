import type { FC } from 'react';
import { TitleSlide } from '../components';

export const Ch4Title: FC = () => (
  <TitleSlide
    chapterLabel="Chapter 4"
    title="CQRS + Tiered Storage"
    subtitle="Command side for state, query side for history"
  />
);
