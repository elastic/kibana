import type { FC } from 'react';
import { ContentSlide, TwoColumns, Card } from '../components';

export const BenefitsTradeoffs: FC = () => (
  <ContentSlide title="Benefits vs. Trade-offs">
    <TwoColumns
      gap="gap-6"
      left={
        <Card variant="success" title="Benefits">
          <ul className="space-y-2.5 mt-2">
            {[
              ['Bounded execution state', 'Index stays small regardless of historical volume'],
              ['O(1) state loading', 'mget with known IDs — no search on hot path'],
              ['Automatic ILM', 'Data streams handle rollover, retention, deletion'],
              ['Unified type model', 'Workflows + steps share base concept, less duplication'],
              ['Idempotent migration', 'Safe to fail, retry, or run multiple times'],
              ['Configurable retention', 'Single knob: lifecycleInterval'],
            ].map(([title, desc], i) => (
              <li key={i} className="flex items-start gap-2 text-slide-sm">
                <span className="text-elastic-green font-bold shrink-0 mt-0.5">+</span>
                <span className="text-slide-secondary"><strong className="text-slide-text">{title}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </Card>
      }
      right={
        <Card variant="warn" title="Trade-offs">
          <ul className="space-y-2.5 mt-2">
            {[
              ['Query complexity', 'Two-tier reads with dedup logic for search and get-by-id'],
              ['Eventual consistency', 'History lags by ~1 day (configurable); active data is always fresh'],
              ['Operational surface', '2 data streams + scheduled task + state index'],
              ['Mapping discipline', 'dynamic: false — new searchable fields need explicit mapping'],
              ['Temporary duplication', 'Data exists in both tiers during overlap window'],
            ].map(([title, desc], i) => (
              <li key={i} className="flex items-start gap-2 text-slide-sm">
                <span className="text-amber-500 font-bold shrink-0 mt-0.5">~</span>
                <span className="text-slide-secondary"><strong className="text-slide-text">{title}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </Card>
      }
    />
  </ContentSlide>
);
