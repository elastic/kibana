import type { FC } from 'react';
import { TitleSlide } from '../components';

export const Title: FC = () => (
  <TitleSlide
    title="CQRS + DataStream"
    subtitle="From Flat Indexes to Tiered Execution Storage"
    meta="Workflows Execution Engine · Kibana Platform"
    showFullLogo
  />
);
