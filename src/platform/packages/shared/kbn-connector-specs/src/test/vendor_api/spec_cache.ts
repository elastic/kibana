/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { z } from '@kbn/zod/v4';
import { readOptional } from './update_vendor_api';

const cacheEntrySchema = z.object({
  url: z.string(),
  fetchedAt: z.iso.datetime(),
  text: z.string(),
});

export interface SpecCacheOptions {
  /** Where fetched documents are kept, outside version control. */
  readonly directory: string;
  readonly fetchText: (url: string) => Promise<string>;
  /** Fetches every URL again instead of reading it from the cache. */
  readonly refresh?: boolean;
  readonly now: () => Date;
  readonly log: { readonly info: (message: string) => void };
}

export interface SpecCache {
  readonly fetchText: (url: string) => Promise<string>;
  /** When the document at a URL that `fetchText` returned was fetched. */
  readonly fetchedAt: (url: string) => Date | undefined;
}

/**
 * Keeps fetched vendor documents by URL, so inspecting a spec and later recording a connector
 * against it use the same document, even when the vendor publishes it from a moving branch.
 */
export const createSpecCache = ({
  directory,
  fetchText,
  refresh = false,
  now,
  log,
}: SpecCacheOptions): SpecCache => {
  const served = new Map<string, Date>();
  const fileOf = (url: string) =>
    path.join(directory, `${createHash('sha256').update(url).digest('hex').slice(0, 32)}.json`);

  return {
    fetchedAt: (url) => served.get(url),
    fetchText: async (url) => {
      const file = fileOf(url);
      const cached = refresh && !served.has(url) ? undefined : await readOptional(file);
      if (cached !== undefined) {
        const entry = cacheEntrySchema.parse(JSON.parse(cached));
        if (!served.has(url)) {
          log.info(`Using ${url} as fetched at ${entry.fetchedAt}; --refresh fetches it again`);
        }
        served.set(url, new Date(entry.fetchedAt));
        return entry.text;
      }
      const text = await fetchText(url);
      const fetchedAt = now();
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(file, JSON.stringify({ url, fetchedAt: fetchedAt.toISOString(), text }));
      served.set(url, fetchedAt);
      return text;
    },
  };
};
