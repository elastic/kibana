/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * RSPack Worker Process
 *
 * This script runs RSPack in a separate child process, similar to how
 * @kbn/optimizer runs webpack in worker threads. This allows the main
 * process to cleanly terminate the build by killing this worker.
 *
 * Communication with parent process via IPC:
 * - Parent sends: { type: 'start', options: {...} }
 * - Worker sends: { type: 'progress', percent: number, stage: string }
 * - Worker sends: { type: 'done', success: boolean, summary?: string, errors?: string[] }
 */

import { DEFAULT_THEME_TAGS } from '@kbn/core-ui-settings-common';
import { runBuild, formatSize } from './run_build';
import type { ThemeTag } from './types';

interface StartMessage {
  type: 'start';
  options: {
    repoRoot: string;
    outputRoot?: string;
    watch?: boolean;
    cache?: boolean;
    dist?: boolean;
    examples?: boolean;
    themeTags?: ThemeTag[];
    hmr?: boolean;
    basePath?: string;
  };
}

type ParentMessage = StartMessage;

// Simple logger that sends messages to parent
const createWorkerLog = () => ({
  info: (msg: string) => process.send?.({ type: 'log', level: 'info', message: msg }),
  error: (msg: string) => process.send?.({ type: 'log', level: 'error', message: msg }),
  warning: (msg: string) => process.send?.({ type: 'log', level: 'warning', message: msg }),
  success: (msg: string) => process.send?.({ type: 'log', level: 'success', message: msg }),
  debug: (msg: string) => process.send?.({ type: 'log', level: 'debug', message: msg }),
  write: () => true,
});

async function handleStart(options: StartMessage['options']) {
  const log = createWorkerLog() as any;

  try {
    const result = await runBuild({
      repoRoot: options.repoRoot,
      outputRoot: options.outputRoot || options.repoRoot,
      watch: options.watch,
      cache: options.cache,
      dist: options.dist,
      examples: options.examples,
      themeTags: options.themeTags ?? [...DEFAULT_THEME_TAGS],
      hmr: options.hmr,
      basePath: options.basePath,
      log,
    });

    if (result.success) {
      const entryLabel = result.entryCount === 1 ? 'entry' : 'entries';
      const summary = `${result.entryCount} ${entryLabel}, ${formatSize(result.totalSize ?? 0)}`;
      process.send?.({ type: 'done', success: true, summary });
    } else {
      process.send?.({ type: 'done', success: false, errors: result.errors });
    }

    // In watch mode, keep the process alive
    if (options.watch) {
      // The worker will be killed by the parent when needed
    }
  } catch (err: any) {
    process.send?.({ type: 'done', success: false, errors: [err.message] });
  }
}

// Handle messages from parent
process.on('message', (message: ParentMessage) => {
  if (message.type === 'start') {
    handleStart(message.options).catch((err) => {
      process.send?.({ type: 'done', success: false, errors: [err.message] });
    });
  }
});

// Signal ready
process.send?.({ type: 'ready' });
