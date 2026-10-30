/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { getWatchOptions } from './watch_options';

const p = (...segments: string[]) => Path.resolve(Path.sep, ...segments);

describe('getWatchOptions', () => {
  it('ignores test files when the compiler sets no ignored pattern', () => {
    const matches = getWatchOptions(undefined).ignored as unknown as (filePath: string) => boolean;
    expect(matches(p('repo', 'pkg', 'src', 'foo.test.ts'))).toBe(true);
    expect(matches(p('repo', 'pkg', 'src', 'foo.ts'))).toBe(false);
  });

  it('keeps a compiler ignored pattern', () => {
    const custom = /custom/;
    expect(getWatchOptions({ ignored: custom }).ignored).toBe(custom);
  });

  it('defaults aggregateTimeout and lets the compiler override it', () => {
    expect(getWatchOptions(undefined).aggregateTimeout).toBe(50);
    expect(getWatchOptions({ aggregateTimeout: 200 }).aggregateTimeout).toBe(200);
  });
});
