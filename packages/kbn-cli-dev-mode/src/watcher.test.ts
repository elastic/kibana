/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createManifestChangeDetector } from './watcher';

describe('createManifestChangeDetector', () => {
  it('ignores rewrites with identical content and detects actual changes', () => {
    const initialManifest = Buffer.from('initial');
    const manifestChanged = createManifestChangeDetector(initialManifest);

    expect(manifestChanged(Buffer.from('initial'))).toBe(false);
    expect(manifestChanged(Buffer.from('updated'))).toBe(true);
    expect(manifestChanged(Buffer.from('updated'))).toBe(false);
  });

  it('uses the first available manifest as its baseline', () => {
    const manifestChanged = createManifestChangeDetector();

    expect(manifestChanged()).toBe(false);
    expect(manifestChanged(Buffer.from('initial'))).toBe(false);
    expect(manifestChanged(Buffer.from('updated'))).toBe(true);
  });
});
