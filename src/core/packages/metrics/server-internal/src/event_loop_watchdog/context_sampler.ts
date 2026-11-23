/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EventLoopBlockContextSamples,
  EventLoopBlockContexts,
  EventLoopBlockExecutionContext,
} from '@kbn/core-metrics-server';
import type { InspectorSession } from './profile_capture';
import type { ContextSamplingStats } from './types';
import {
  CONTEXT_READER_KEY,
  CONTEXT_SAMPLE_AFTER_MS,
  CONTEXT_SAMPLE_INTERVAL_MS,
  MAX_CONTEXT_FIELD_LENGTH,
  MAX_CONTEXT_SAMPLES,
  MAX_REPORTED_CONTEXTS,
} from './constants';

/** Calls the reader the main thread installed; `undefined` when there is none. */
export const SAMPLE_EXPRESSION = `globalThis[Symbol.for(${JSON.stringify(
  CONTEXT_READER_KEY
)})]?.()`;

/** The parts of a `Runtime.evaluate` response the sampler reads. */
interface EvaluateResponse {
  result?: { type?: string; subtype?: string; value?: unknown };
  exceptionDetails?: { text?: string };
}

interface SampledBlock {
  startedAt: number;
  /** Opened for the block's first sample and closed when the block ends. */
  session?: InspectorSession;
  nextSampleAt: number;
  /** A sample was requested and not answered yet: one at a time. */
  pending: boolean;
  requested: number;
  answered: number;
  withoutContext: number;
  byContext: Map<string, { context: EventLoopBlockExecutionContext; samples: number }>;
  failed: boolean;
}

export interface ContextSamplerParams {
  createSession: () => InspectorSession;
  /**
   * Whether the main thread is still in the block that started at `blockStartedAt`. An answer that
   * arrives after the block was computed outside the blocking code, and is dropped.
   */
  isBlocked: (blockStartedAt: number) => boolean;
  /** Called when a block's sampling fails; that block isn't sampled further. */
  onFailure: (error: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Capped, and without control characters: the value ends up in a log message. */
const field = (value: unknown): string | undefined =>
  typeof value === 'string'
    ? value.slice(0, MAX_CONTEXT_FIELD_LENGTH).replace(/\p{Cc}/gu, ' ')
    : undefined;

const toContext = (value: Record<string, unknown>): EventLoopBlockExecutionContext => {
  const type = field(value.type);
  const name = field(value.name);
  const id = field(value.id);
  return {
    ...(type === undefined ? {} : { type }),
    ...(name === undefined ? {} : { name }),
    ...(id === undefined ? {} : { id }),
  };
};

const noSamples = (): ContextSamplingStats => ({ sampledBlocks: 0, samples: 0, failed: 0 });

/**
 * Samples which execution context the main thread is running in while it is blocked. Each sample
 * is a `Runtime.evaluate` inspector command: V8 runs it on the main thread through an interrupt,
 * inside the blocking code, so the reader it calls sees that code's execution context.
 */
export class ContextSampler {
  private block?: SampledBlock;
  private counts = noSamples();

  constructor(private readonly params: ContextSamplerParams) {}

  /** Counts since the last `resetStats()`. */
  public get stats(): ContextSamplingStats {
    return this.counts;
  }

  public resetStats(): void {
    this.counts = noSamples();
  }

  /** Requests a sample of the ongoing block if one is due; call it on every poll of the block. */
  public sample(blockStartedAt: number, nowMs: number): void {
    if (this.block?.startedAt !== blockStartedAt) {
      this.release();
      this.block = {
        startedAt: blockStartedAt,
        nextSampleAt: blockStartedAt + CONTEXT_SAMPLE_AFTER_MS,
        pending: false,
        requested: 0,
        answered: 0,
        withoutContext: 0,
        byContext: new Map(),
        failed: false,
      };
    }
    const { block } = this;
    if (
      block.failed ||
      block.pending ||
      block.requested >= MAX_CONTEXT_SAMPLES ||
      nowMs < block.nextSampleAt
    ) {
      return;
    }
    block.nextSampleAt = nowMs + CONTEXT_SAMPLE_INTERVAL_MS;
    block.requested++;
    block.pending = true;
    let answer: Promise<unknown>;
    try {
      if (!block.session) {
        block.session = this.params.createSession();
        block.session.connectToMainThread();
      }
      answer = block.session.post('Runtime.evaluate', {
        expression: SAMPLE_EXPRESSION,
        returnByValue: true,
        silent: true,
      });
    } catch (error) {
      this.fail(block, error);
      return;
    }
    answer.then(
      (response) => {
        block.pending = false;
        if (this.block === block && this.params.isBlocked(block.startedAt)) {
          this.record(block, response as EvaluateResponse);
        }
      },
      (error) => {
        // Closing the session of a block that ended rejects its pending sample.
        if (this.block === block) {
          this.fail(block, error);
        }
      }
    );
  }

  /** What the samples of the block found so far; `undefined` before its first answered sample. */
  public contexts(blockStartedAt: number): EventLoopBlockContexts | undefined {
    const { block } = this;
    if (block?.startedAt !== blockStartedAt || block.answered === 0) {
      return undefined;
    }
    const top: EventLoopBlockContextSamples[] = [...block.byContext.values()]
      .sort((a, b) => b.samples - a.samples)
      .slice(0, MAX_REPORTED_CONTEXTS)
      .map(({ context, samples }) => ({ context, samples }));
    return { samples: block.answered, withoutContext: block.withoutContext, top };
  }

  /** Ends the sampling of a block and returns what its samples found. */
  public end(blockStartedAt: number): EventLoopBlockContexts | undefined {
    const contexts = this.contexts(blockStartedAt);
    if (contexts) {
      this.counts.sampledBlocks++;
    }
    this.release();
    return contexts;
  }

  /** Closes the session of the block being sampled, if any. */
  public release(): void {
    const { block } = this;
    this.block = undefined;
    if (block) {
      this.disconnect(block);
    }
  }

  private record(block: SampledBlock, { result, exceptionDetails }: EvaluateResponse): void {
    if (exceptionDetails) {
      this.fail(block, new Error(exceptionDetails.text ?? 'the execution context reader threw'));
      return;
    }
    if (result?.subtype === 'null') {
      block.answered++;
      block.withoutContext++;
      this.counts.samples++;
      return;
    }
    if (!isRecord(result?.value)) {
      this.fail(block, new Error('the execution context reader is not installed'));
      return;
    }
    const context = toContext(result.value);
    const key = JSON.stringify(context);
    const entry = block.byContext.get(key);
    if (entry) {
      entry.samples++;
    } else {
      block.byContext.set(key, { context, samples: 1 });
    }
    block.answered++;
    this.counts.samples++;
  }

  private fail(block: SampledBlock, error: unknown): void {
    block.pending = false;
    block.failed = true;
    this.counts.failed++;
    this.disconnect(block);
    this.params.onFailure(error);
  }

  private disconnect(block: SampledBlock): void {
    const { session } = block;
    block.session = undefined;
    try {
      session?.disconnect();
    } catch {
      // Already closed.
    }
  }
}
