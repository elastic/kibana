import { useState, useEffect, useCallback, type FC, type ReactNode } from 'react';
import { TableOfContents, FullscreenToggle, type SlideMeta } from './components';
import {
  Title, Agenda, Ch1Title, FourProperties,
  Ch2Title, SingleIndex, ConflictingPatterns,
  Ch3Title, WhyNotDataStreams, WhyNotEventSourcing,
  Ch4Title, TwoTierOverview, UnifiedState, MgetEliminatesSearch,
  Ch5Title, ExecutionPath, UIPath, Migration, FailureRecovery,
  Ch6Title, BenefitsTradeoffs, Discussion,
} from './slides';

const SLIDES: FC[] = [
  Title, Agenda,
  Ch1Title, FourProperties,
  Ch2Title, SingleIndex, ConflictingPatterns,
  Ch3Title, WhyNotDataStreams, WhyNotEventSourcing,
  Ch4Title, TwoTierOverview, UnifiedState, MgetEliminatesSearch,
  Ch5Title, ExecutionPath, UIPath, Migration, FailureRecovery,
  Ch6Title, BenefitsTradeoffs,
  Discussion,
];

const isTitleSlide = (idx: number) => [0, 2, 4, 7, 10, 14, 19, 21].includes(idx);

const SLIDE_META: SlideMeta[] = [
  { label: 'Title',                          chapter: 'Opening' },
  { label: 'Agenda',                         chapter: 'Opening' },
  { label: 'Why We\'re Unique',              chapter: 'Ch 1 — Why We\'re Unique' },
  { label: 'Four Properties',                chapter: 'Ch 1 — Why We\'re Unique' },
  { label: 'The Problem',                    chapter: 'Ch 2 — The Problem' },
  { label: 'Single Index Pain',              chapter: 'Ch 2 — The Problem' },
  { label: 'Conflicting Patterns',           chapter: 'Ch 2 — The Problem' },
  { label: 'Obvious Solutions Fail',         chapter: 'Ch 3 — Obvious Solutions' },
  { label: 'Why Not Data Streams?',          chapter: 'Ch 3 — Obvious Solutions' },
  { label: 'Why Not Event Sourcing?',        chapter: 'Ch 3 — Obvious Solutions' },
  { label: 'CQRS + Tiered Storage',          chapter: 'Ch 4 — The Solution' },
  { label: 'Two-Tier Overview',              chapter: 'Ch 4 — The Solution' },
  { label: 'Unified State Index',            chapter: 'Ch 4 — The Solution' },
  { label: 'mget Eliminates Search',         chapter: 'Ch 4 — The Solution' },
  { label: 'How It Works',                   chapter: 'Ch 5 — How It Works' },
  { label: 'Execution Path',                 chapter: 'Ch 5 — How It Works' },
  { label: 'UI Path',                        chapter: 'Ch 5 — How It Works' },
  { label: 'Migration & Cleanup',            chapter: 'Ch 5 — How It Works' },
  { label: 'Failure Recovery',               chapter: 'Ch 5 — How It Works' },
  { label: 'Benefits & Trade-offs',          chapter: 'Ch 6 — Trade-offs' },
  { label: 'Benefits vs. Trade-offs',        chapter: 'Ch 6 — Trade-offs' },
  { label: 'Discussion',                     chapter: 'Closing' },
];

const SlideWrapper = ({ children, isTitle, active }: { children: ReactNode; isTitle: boolean; active: boolean }) => (
  <div
    className={`slide-wrapper absolute inset-0 flex flex-col justify-center items-center transition-opacity duration-300
      ${active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      ${isTitle ? 'bg-elastic-blue text-white' : 'bg-white text-slide-text'}
    `}
    style={{ padding: '60px 80px' }}
  >
    {children}
  </div>
);

const ElasticWatermark = () => (
  <div className="fixed bottom-4 right-16 z-50 flex items-center gap-1.5 opacity-40">
    <img src="/icons/elastic-logo.svg" width={18} height={18} alt="Elastic" />
    <span className="text-xs font-semibold text-slide-muted">elastic</span>
  </div>
);

const readHash = (total: number): number => {
  const n = parseInt(window.location.hash.replace('#', ''), 10);
  return Number.isFinite(n) && n >= 0 && n < total ? n : 0;
};

export const App = () => {
  const total = SLIDES.length;
  const [current, setCurrent] = useState(() => readHash(total));

  const go = useCallback((n: number) => {
    if (n >= 0 && n < total) {
      setCurrent(n);
      window.location.hash = String(n);
    }
  }, [total]);

  useEffect(() => {
    const onHashChange = () => setCurrent(readHash(total));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(current - 1); }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(total - 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, go, total]);

  return (
    <div className="relative w-full h-full">
      {SLIDES.map((Slide, i) => (
        <SlideWrapper key={i} isTitle={isTitleSlide(i)} active={i === current}>
          <Slide />
        </SlideWrapper>
      ))}

      <div className="nav-chrome">
        <ElasticWatermark />
        <TableOfContents slides={SLIDE_META} current={current} onNavigate={go} />
        <FullscreenToggle />

        <div
          className="fixed bottom-0 left-0 h-[3px] bg-elastic-blue z-50 transition-all duration-300"
          style={{ width: `${total > 1 ? (current / (total - 1)) * 100 : 0}%` }}
        />

        <div className="fixed bottom-4 right-6 text-xs font-medium text-slide-muted z-50">
          {current + 1} / {total}
        </div>
      </div>
    </div>
  );
};
