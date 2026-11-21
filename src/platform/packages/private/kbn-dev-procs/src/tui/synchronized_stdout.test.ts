/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PassThrough } from 'stream';
import { createSynchronizedStdout } from './synchronized_stdout';

describe('createSynchronizedStdout', () => {
  it('wraps each string write in a synchronized update and passes everything else through', () => {
    const stream = new PassThrough();
    const synchronized = createSynchronizedStdout(stream);

    synchronized.write('\u001b[2K frame');
    synchronized.write(Buffer.from('raw'));

    expect(stream.read().toString()).toBe('\u001b[?2026h\u001b[2K frame\u001b[?2026lraw');
    expect(synchronized.writable).toBe(true);
  });

  it('keeps listeners on the underlying stream', () => {
    const stream = new PassThrough();
    const synchronized = createSynchronizedStdout(stream);
    const onResize = jest.fn();

    synchronized.on('resize', onResize);
    stream.emit('resize');

    expect(onResize).toHaveBeenCalledTimes(1);
  });
});
