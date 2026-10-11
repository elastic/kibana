/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { performance } from 'perf_hooks';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Runnable, Runner } from '../fake_mocha_types';

export type WaitCategory = 'sleep' | 'retryDelay' | 'retry' | 'webdriverWait' | 'lookup';

interface Interval {
  startMs: number;
  endMs: number;
}

interface WaitSpan extends Interval {
  category: WaitCategory;
  name: string;
  runnableId?: number;
  stack: string;
  completed: boolean;
}

interface RunnableSpan extends Interval {
  id: number;
  type: 'test' | 'hook';
  title: string;
  file: string;
  result: 'passed' | 'failed' | 'skipped' | 'interrupted';
}

const captureStack = (): string => {
  const limit = Error.stackTraceLimit;
  try {
    Error.stackTraceLimit = 40;
    return (
      new Error().stack
        ?.split('\n')
        .slice(2)
        .filter(
          (line) =>
            !/node_modules|kbn-apm-utils|node:|wait_recorder\.ts|lib\/lifecycle\.ts|remote\/remote\.ts/.test(
              line
            )
        )
        .join('\n') ?? ''
    );
  } finally {
    Error.stackTraceLimit = limit;
  }
};

const unionMs = (intervals: readonly Interval[]): number => {
  let total = 0;
  let end = 0;
  for (const interval of [...intervals].sort((a, b) => a.startMs - b.startMs)) {
    total += Math.max(0, interval.endMs - Math.max(end, interval.startMs));
    end = Math.max(end, interval.endMs);
  }
  return total;
};

interface WaitSummary {
  sleepAndBackoffMs: number;
  waitMs: number;
  waitOrLookupMs: number;
  byCategory: Record<string, { calls: number; durationMs: number }>;
}

interface WaitReport extends WaitSummary {
  version: number;
  config: string;
  startedAt?: string;
  durationMs: number;
  result: 'running' | 'passed' | 'failed' | 'interrupted';
  nodeVersion: string;
  files: Array<WaitSummary & { file: string; durationMs: number }>;
  runnables: Array<RunnableSpan & WaitSummary & { durationMs: number }>;
  waits: readonly WaitSpan[];
}

const clipToRunnable = (spans: readonly WaitSpan[], runnable: RunnableSpan): WaitSpan[] =>
  spans
    .filter(({ runnableId }) => runnableId === runnable.id)
    .map((span) => ({
      ...span,
      startMs: Math.max(span.startMs, runnable.startMs),
      endMs: Math.min(span.endMs, runnable.endMs),
    }))
    .filter(({ startMs, endMs }) => endMs >= startMs);

const summarize = (spans: readonly WaitSpan[]): WaitSummary => {
  const measuredWaits = spans.filter(({ category }) =>
    ['sleep', 'retryDelay', 'webdriverWait'].includes(category)
  );
  return {
    sleepAndBackoffMs: unionMs(
      spans.filter(({ category }) => ['sleep', 'retryDelay'].includes(category))
    ),
    waitMs: unionMs(measuredWaits),
    waitOrLookupMs: unionMs(spans.filter(({ category }) => category !== 'retry')),
    byCategory: Object.fromEntries(
      (['sleep', 'retryDelay', 'retry', 'webdriverWait', 'lookup'] as const).map((category) => {
        const matching = spans.filter((span) => span.category === category);
        return [category, { calls: matching.length, durationMs: unionMs(matching) }];
      })
    ),
  };
};

export class WaitRecorder {
  private startTime?: number;
  private endTime?: number;
  private startedAt?: string;
  private current?: RunnableSpan;
  private test?: RunnableSpan;
  private nextId = 1;
  private finished = false;
  private failures = 0;
  private readonly runnables: RunnableSpan[] = [];
  private readonly waits: WaitSpan[] = [];
  private readonly pending = new Set<WaitSpan>();

  constructor(
    private readonly configPath: string,
    private readonly now = () => performance.now()
  ) {}

  public attach(runner: Runner): void {
    runner.on('start', () => {
      this.startTime = this.now();
      this.startedAt = new Date().toISOString();
    });
    const createRunnable = (runnable: Runnable, type: RunnableSpan['type']): RunnableSpan => ({
      id: this.nextId++,
      type,
      title: runnable.titlePath().join(' > '),
      file: relative(REPO_ROOT, runnable.file ?? runnable.parent?.file ?? this.configPath),
      startMs: this.elapsed(),
      endMs: this.elapsed(),
      result: 'interrupted',
    });
    runner.on('test', (runnable: Runnable) => {
      this.test = createRunnable(runnable, 'test');
      this.current = this.test;
    });
    runner.on('hook', (runnable: Runnable) => {
      if (this.current?.type === 'hook') this.endRunnable('interrupted');
      this.current = createRunnable(runnable, 'hook');
    });
    runner.on('hook end', (hook: Runnable) => {
      this.endRunnable(hook.isFailed() ? 'failed' : 'passed');
      // Mocha emits `test` before beforeEach hooks. Reset the test's start after
      // each hook so its interval includes only its body, and hooks stay separate.
      if (hook.parent?._beforeEach.includes(hook) && this.test && !hook.isFailed()) {
        this.test.startMs = this.elapsed();
        this.current = this.test;
      }
    });
    runner.on('test end', (runnable: Runnable) => {
      if (this.current?.type === 'test') {
        this.endRunnable(
          runnable.isPending() ? 'skipped' : runnable.isFailed() ? 'failed' : 'passed'
        );
      }
      this.test = undefined;
    });
    runner.on('fail', () => {
      this.failures++;
      if (this.current?.type === 'hook') this.endRunnable('failed');
    });
    runner.on('retry', () => {
      this.endRunnable('failed');
      this.test = undefined;
    });
    runner.on('end', () => {
      this.finished = true;
      this.stop();
    });
  }

  public beginWait(category: WaitCategory, name: string): () => void {
    if (this.startTime === undefined || this.endTime !== undefined) {
      return () => {};
    }
    const span: WaitSpan = {
      category,
      name,
      runnableId: this.current?.id,
      startMs: this.elapsed(),
      endMs: this.elapsed(),
      stack: captureStack(),
      completed: false,
    };
    this.waits.push(span);
    this.pending.add(span);
    return () => {
      if (this.pending.delete(span)) {
        span.endMs = this.elapsed();
        span.completed = true;
      }
    };
  }

  public stop(): void {
    if (this.startTime === undefined || this.endTime !== undefined) return;
    this.endTime = this.now();
    this.endRunnable('interrupted');
    for (const span of this.pending) {
      span.endMs = this.elapsed();
    }
    this.pending.clear();
  }

  public getReport(): WaitReport {
    const fileNames = [...new Set(this.runnables.map(({ file }) => file))];
    const runnables = this.runnables.map((runnable) => ({
      ...runnable,
      durationMs: runnable.endMs - runnable.startMs,
      ...summarize(clipToRunnable(this.waits, runnable)),
    }));
    return {
      version: 1,
      config: relative(REPO_ROOT, this.configPath),
      startedAt: this.startedAt,
      durationMs: this.elapsed(),
      nodeVersion: process.version,
      result:
        this.failures > 0
          ? 'failed'
          : this.runnables.some(({ result }) => result === 'interrupted')
          ? 'interrupted'
          : this.finished
          ? 'passed'
          : this.endTime === undefined
          ? 'running'
          : 'interrupted',
      ...summarize(this.waits),
      files: fileNames.map((file) => {
        const matching = runnables.filter((runnable) => runnable.file === file);
        return {
          file,
          durationMs: unionMs(matching),
          ...summarize(matching.flatMap((runnable) => clipToRunnable(this.waits, runnable))),
        };
      }),
      runnables,
      waits: this.waits,
    };
  }

  public write(directory: string): string | undefined {
    if (this.startTime === undefined) return;
    this.stop();
    mkdirSync(directory, { recursive: true });
    const reportPath = join(directory, 'waits.json');
    writeFileSync(reportPath, JSON.stringify(this.getReport(), null, 2) + '\n');
    const traceEvents = [
      ...this.runnables.map((span) => ({ ...span, category: span.type, name: span.title })),
      ...this.waits,
    ].map((span) => ({
      name: span.name,
      cat: span.category,
      ph: 'X',
      ts: span.startMs * 1000,
      dur: (span.endMs - span.startMs) * 1000,
      pid: process.pid,
      tid: ['test', 'hook', 'sleep', 'retryDelay', 'retry', 'webdriverWait', 'lookup'].indexOf(
        span.category
      ),
      args: span,
    }));
    writeFileSync(join(directory, 'trace.json'), JSON.stringify({ traceEvents }) + '\n');
    return reportPath;
  }

  private elapsed(): number {
    return this.startTime === undefined ? 0 : (this.endTime ?? this.now()) - this.startTime;
  }

  private endRunnable(result: RunnableSpan['result']): void {
    if (this.current) {
      this.current.endMs = this.elapsed();
      this.current.result = result;
      this.runnables.push(this.current);
      this.current = undefined;
    }
  }
}
