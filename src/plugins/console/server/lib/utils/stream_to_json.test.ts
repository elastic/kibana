/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { streamToJSON } from './stream_to_json';
import type { IncomingMessage } from 'http';

describe('streamToString', () => {
  it('should limit the response size', async () => {
    const stream = new Readable({
      read() {
        this.push('a'.repeat(1000));
      },
    });
    await expect(
      streamToJSON(stream as IncomingMessage, 500)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Response size limit exceeded"`);
  });

  it('should parse the response', async () => {
    const stream = new Readable({
      read() {
        this.push('{"test": "test"}');
        this.push(null);
      },
    });
    const result = await streamToJSON(stream as IncomingMessage, 5000);
    expect(result).toEqual({ test: 'test' });
  });
});
