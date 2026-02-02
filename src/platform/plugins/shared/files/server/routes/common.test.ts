/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { File } from '../file';
import { getFileHttpResponseOptions } from './common';

describe('getDownloadHeadersForFile', () => {
  function expectResult({ contentType }: { contentType: string }) {
    return {
      fileContentType: contentType,
      headers: {
        'cache-control': 'max-age=31536000, immutable',
      },
    };
  }

  const file = { data: { name: 'test', mimeType: undefined } } as unknown as File;
  test('no mime type', () => {
    expect(getFileHttpResponseOptions(file)).toEqual(
      expectResult({ contentType: 'application/octet-stream' })
    );
  });

  test('mime type', () => {
    const fileWithMime = { data: { ...file.data, mimeType: 'application/pdf' } } as File;
    expect(getFileHttpResponseOptions(fileWithMime)).toEqual(
      expectResult({ contentType: 'application/pdf' })
    );
  });
});
