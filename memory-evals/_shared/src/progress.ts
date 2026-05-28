import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { BenchmarkName, QuestionResult, RunState } from './types.js';

export interface ProgressTrackerOptions {
  dir: string;
  runId: string;
  benchmark: BenchmarkName;
}

/**
 * Tiny disk-backed checkpoint. On every mutation we write to
 * `<dir>/state.json.tmp` then atomically rename, so a SIGINT mid-write
 * doesn't corrupt the file.
 *
 * Concurrent runners writing to the same `dir` are NOT supported; callers
 * should pick a unique `run_id` per process.
 */
export class ProgressTracker {
  readonly path: string;
  private state: RunState;

  constructor(private readonly opts: ProgressTrackerOptions) {
    this.path = join(opts.dir, 'state.json');
    this.state = {
      run_id: opts.runId,
      benchmark: opts.benchmark,
      started_at: new Date().toISOString(),
      completed: {},
    };
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.path, 'utf8');
      const parsed = JSON.parse(raw) as RunState;
      if (parsed.benchmark !== this.opts.benchmark) {
        throw new Error(
          `state.json benchmark mismatch: ${parsed.benchmark} vs ${this.opts.benchmark}`
        );
      }
      if (parsed.run_id !== this.opts.runId) {
        throw new Error(
          `state.json run_id mismatch: ${parsed.run_id} vs ${this.opts.runId}. ` +
            `Pick a fresh --run-id or remove ${this.path}.`
        );
      }
      this.state = parsed;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'ENOENT') throw err;
    }
    await mkdir(dirname(this.path), { recursive: true });
  }

  isCompleted(questionId: string): boolean {
    return questionId in this.state.completed;
  }

  get(questionId: string): QuestionResult | undefined {
    return this.state.completed[questionId];
  }

  async markInFlight(
    questionId: string,
    conversationIds: string[],
    agentId: string
  ): Promise<void> {
    this.state.in_flight = {
      question_id: questionId,
      conversation_ids: conversationIds,
      agent_id: agentId,
      started_at: new Date().toISOString(),
    };
    await this.flush();
  }

  async clearInFlight(): Promise<void> {
    delete this.state.in_flight;
    await this.flush();
  }

  takeInFlight(): RunState['in_flight'] | undefined {
    return this.state.in_flight;
  }

  /** Used by LoCoMo to remember per-sample shared conversations. */
  async recordSample(
    sampleId: string,
    info: { conversation_ids: string[]; sessions_fed: number; agent_id: string }
  ): Promise<void> {
    this.state.samples = this.state.samples ?? {};
    this.state.samples[sampleId] = {
      ...info,
      started_at: this.state.samples[sampleId]?.started_at ?? new Date().toISOString(),
    };
    await this.flush();
  }

  getSample(sampleId: string): RunState['samples'] extends infer T
    ? T extends Record<string, infer V>
      ? V | undefined
      : undefined
    : undefined {
    return (this.state.samples?.[sampleId] ?? undefined) as never;
  }

  async record(result: QuestionResult): Promise<void> {
    this.state.completed[result.question_id] = result;
    delete this.state.in_flight;
    await this.flush();
  }

  snapshot(): RunState {
    return JSON.parse(JSON.stringify(this.state));
  }

  results(): QuestionResult[] {
    return Object.values(this.state.completed);
  }

  private async flush(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, JSON.stringify(this.state, null, 2), 'utf8');
    await rename(tmp, this.path);
  }
}
