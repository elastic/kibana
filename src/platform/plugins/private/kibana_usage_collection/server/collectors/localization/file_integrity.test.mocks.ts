/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';

jest.doMock('fs', () => ({
  createReadStream(filepath: string): Readable {
    if (filepath === 'ERROR') {
      throw new Error('MOCK ERROR - Invalid Path');
    }
    const readableStream = new Readable();
    const streamData = filepath.split('');
    let cursor = 0;

    readableStream._read = function (size) {
      const current = streamData[cursor++];
      if (typeof current === 'undefined') {
        return this.push(null);
      }
      this.push(current);
    };

    return readableStream;
  },
}));
