/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';

interface EncodingCandidate {
  name: string;
  q: number;
  index: number;
}

function parseAcceptEncoding(acceptEncoding: string | undefined): EncodingCandidate[] {
  if (acceptEncoding == null || acceptEncoding.trim() === '') {
    return [];
  }
  const entries: EncodingCandidate[] = [];
  const parts = acceptEncoding.split(',');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!.trim();
    if (part === '') {
      continue;
    }
    const segments = part.split(';').map((s) => s.trim());
    const codingPart = segments[0]!;
    const name = codingPart.toLowerCase();
    if (name === 'identity') {
      continue;
    }
    let q = 1;
    for (let s = 1; s < segments.length; s++) {
      const param = segments[s]!;
      const eq = param.indexOf('=');
      if (eq === -1) {
        continue;
      }
      const key = param.slice(0, eq).trim();
      const value = param.slice(eq + 1).trim();
      if (key === 'q') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          q = parsed;
        }
      }
    }
    if (q === 0) {
      continue;
    }
    entries.push({ name, q, index: i });
  }
  entries.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    return b.index - a.index;
  });
  return entries;
}

/**
 * Ordered list of pre-compressed encodings to try for a static file, mirroring
 * Hapi Inert `lookupCompressed` negotiation used by `HttpServer.registerStaticDir`.
 *
 * @internal
 */
export function orderPrecompressedEncodings(
  acceptEncoding: string | undefined
): Array<'br' | 'gzip'> {
  const ordered: Array<'br' | 'gzip'> = [];
  for (const e of parseAcceptEncoding(acceptEncoding)) {
    if (e.name === 'br') {
      ordered.push('br');
    } else if (e.name === 'gzip' || e.name === 'x-gzip') {
      ordered.push('gzip');
    }
  }
  return ordered;
}

/**
 * If a sibling `path.br` / `path.gz` exists, return it (first match wins per
 * {@link orderPrecompressedEncodings}); otherwise the original `filePath`.
 *
 * @internal
 */
export async function resolvePrecompressedStaticPath(
  filePath: string,
  acceptEncoding: string | undefined
): Promise<{ path: string; contentEncoding?: 'br' | 'gzip' }> {
  for (const enc of orderPrecompressedEncodings(acceptEncoding)) {
    const candidate = enc === 'br' ? `${filePath}.br` : `${filePath}.gz`;
    try {
      const st = await fs.stat(candidate);
      if (st.isFile()) {
        return { path: candidate, contentEncoding: enc };
      }
    } catch {
      continue;
    }
  }
  return { path: filePath };
}
