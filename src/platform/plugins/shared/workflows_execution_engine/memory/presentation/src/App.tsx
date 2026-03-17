import { useState, useEffect, useCallback, type FC, type ReactNode } from 'react';
import { TableOfContents, FullscreenToggle, type SlideMeta } from './components';
import {
  Title,
  Agenda,
  Ch1Title,
  CurrentState,
  ProblemsAtScale,
  Challenge,
  Ch2Title,
  DataStreamsOption,
  EventSourcing,
  CQRSOverview,
  CQRSQueryComplexity,
  CQRSMigration,
  WhyNotCQRS,
  Ch3Title,
  NothingChanges,
  HowRollover,
  IndexPinning,
  ILMPhases,
  EncodedIDs,
  ReadsDuringExecution,
  ReadsViaUI,
  Migration,
  Benefits,
  CQRSvsRollover,
  OpenQuestions,
  Discussion,
} from './slides';

const SLIDES: FC[] = [
  Title,
  Agenda,
  Ch1Title,
  CurrentState,
  ProblemsAtScale,
  Challenge,
  Ch2Title,
  DataStreamsOption,
  EventSourcing,
  CQRSOverview,
  CQRSQueryComplexity,
  CQRSMigration,
  WhyNotCQRS,
  Ch3Title,
  NothingChanges,
  HowRollover,
  IndexPinning,
  EncodedIDs,
  ReadsDuringExecution,
  ReadsViaUI,
  ILMPhases,
  Migration,
  Benefits,
  CQRSvsRollover,
  OpenQuestions,
  Discussion,
];

const isTitleSlide = (idx: number) => [0, 2, 6, 13, 25].includes(idx);

const SLIDE_META: SlideMeta[] = [
  { label: 'Title',                   chapter: 'Opening' },
  { label: 'Agenda',                  chapter: 'Opening' },
  { label: 'Why We Need to Change',   chapter: 'Ch 1 — Motivation' },
  { label: 'Current State',           chapter: 'Ch 1 — Motivation' },
  { label: 'Problems at Scale',       chapter: 'Ch 1 — Motivation' },
  { label: 'The Challenge',           chapter: 'Ch 1 — Motivation' },
  { label: 'Options We Evaluated',    chapter: 'Ch 2 — Options' },
  { label: 'Data Streams',            chapter: 'Ch 2 — Options' },
  { label: 'Event Sourcing',          chapter: 'Ch 2 — Options' },
  { label: 'CQRS Overview',           chapter: 'Ch 2 — Options' },
  { label: 'CQRS Query Complexity',   chapter: 'Ch 2 — Options' },
  { label: 'CQRS Migration Overhead', chapter: 'Ch 2 — Options' },
  { label: 'Why We Moved Past CQRS',  chapter: 'Ch 2 — Options' },
  { label: 'Rollover Indexes + ILM',  chapter: 'Ch 3 — Chosen Approach' },
  { label: 'Nothing Changes',         chapter: 'Ch 3 — Chosen Approach' },
  { label: 'How Rollover Works',      chapter: 'Ch 3 — Chosen Approach' },
  { label: 'Index Pinning',           chapter: 'Ch 3 — Chosen Approach' },
  { label: 'Encoded IDs',             chapter: 'Ch 3 — Chosen Approach' },
  { label: 'Reads During Execution',  chapter: 'Ch 3 — Chosen Approach' },
  { label: 'Reads via UI',            chapter: 'Ch 3 — Chosen Approach' },
  { label: 'ILM Lifecycle Phases',    chapter: 'Ch 3 — Chosen Approach' },
  { label: 'Migration',               chapter: 'Ch 3 — Chosen Approach' },
  { label: 'Benefits',                chapter: 'Ch 3 — Chosen Approach' },
  { label: 'CQRS vs Rollover',        chapter: 'Ch 3 — Chosen Approach' },
  { label: 'Open Questions',          chapter: 'Closing' },
  { label: 'Discussion',              chapter: 'Closing' },
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
