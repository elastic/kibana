/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @jest-environment jsdom
 */

import './polyfills.jsdom';
import { execa } from 'execa';

describe('jsdom polyfills', () => {
  it('lets execa run subprocesses with JSDOM AbortSignals', async () => {
    const { stdout } = await execa(process.execPath, ['-e', 'process.stdout.write("ok")']);

    expect(stdout).toBe('ok');
  });
});
