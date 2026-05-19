/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { statSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Logger } from '@kbn/core/server';

// Defer importing react-docgen-typescript (large dep) until first use.
interface RdtParser {
  parse: (filePath: string) => RdtComponentDoc[];
}

export interface RdtComponentDoc {
  displayName: string;
  props: Record<string, RdtProp>;
}

export interface RdtProp {
  name: string;
  type: { name: string; value?: Array<{ value: string }> };
  defaultValue: { value: string } | null;
  description: string;
  required: boolean;
}

interface CacheEntry {
  mtime: number;
  docs: RdtComponentDoc[];
}

let parser: RdtParser | null = null;
const cache = new Map<string, CacheEntry>();
let logger: Logger | null = null;

/**
 * Initialize the docgen cache. Creates the react-docgen-typescript parser and
 * warms the underlying ts.Program by parsing a small file.
 *
 * Must be called once at plugin setup time (dev mode only).
 */
export const initDocgenCache = async (log: Logger): Promise<void> => {
  logger = log;
  logger.info('[docgen] warm ts.Program initializing…');

  const heapBefore = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  logger.info(`[docgen] heap before warm-up: ${heapBefore} MB`);

  const start = Date.now();
  try {
    const { withCustomConfig } = await import('react-docgen-typescript');
    const tsconfigPath = join(REPO_ROOT, 'tsconfig.json');
    parser = withCustomConfig(tsconfigPath, {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: { skipPropsWithoutDoc: false },
    });

    // Warm up by parsing a small known file so the first real request is fast.
    const warmupFile = join(
      REPO_ROOT,
      'src/platform/plugins/private/inspect_component/server/lib/codeowners/get_component_codeowners.ts'
    );
    try {
      parser.parse(warmupFile);
    } catch {
      // Warm-up file might not have exported components — that's fine.
    }

    const elapsed = Date.now() - start;
    const heapAfter = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    logger.info(`[docgen] warm ts.Program ready in ${elapsed}ms`);
    logger.info(`[docgen] heap after warm-up: ${heapAfter} MB`);
  } catch (e) {
    logger.warn(`[docgen] failed to initialize: ${e}`);
  }
};

let requestCount = 0;

/**
 * Returns docgen for the component `displayName` from `filePath`.
 * Results are cached per file and invalidated on mtime change.
 */
export const getDocgen = (
  filePath: string,
  displayName: string
): { docs: RdtComponentDoc[]; hitMs: number; miss: boolean } | null => {
  if (!parser) return null;

  const start = Date.now();
  let miss = false;

  let currentMtime: number;
  try {
    currentMtime = statSync(filePath).mtimeMs;
  } catch {
    return null;
  }

  const cached = cache.get(filePath);
  let docs: RdtComponentDoc[];

  if (cached && cached.mtime === currentMtime) {
    docs = cached.docs;
  } else {
    miss = true;
    try {
      docs = parser.parse(filePath);
    } catch {
      return null;
    }
    cache.set(filePath, { mtime: currentMtime, docs });
  }

  const elapsed = Date.now() - start;

  requestCount++;
  if (requestCount === 10 && logger) {
    const heapNow = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    logger.info(`[docgen] heap after 10 requests: ${heapNow} MB`);
  }

  return { docs, hitMs: elapsed, miss };
};
