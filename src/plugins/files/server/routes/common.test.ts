/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { File } from '../file';
import { getDownloadHeadersForFile } from './common';

describe('getDownloadHeadersForFile', () => {
  function expectHeaders({
    contentDisposition,
    contentType,
  }: {
    contentDisposition: string;
    contentType: string;
  }) {
    return {
      'content-type': contentType,
      'content-disposition': `attachment; filename="${contentDisposition}"`,
      'cache-control': 'max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    };
  }

  const file = { data: { name: 'test', mimeType: undefined } } as unknown as File;
  test('no mime type and name from file object', () => {
    expect(getDownloadHeadersForFile({ file, fileName: undefined })).toEqual(
      expectHeaders({ contentType: 'application/octet-stream', contentDisposition: 'test' })
    );
  });

  test('no mime type and name (without ext)', () => {
    expect(getDownloadHeadersForFile({ file, fileName: 'myfile' })).toEqual(
      expectHeaders({ contentType: 'application/octet-stream', contentDisposition: 'myfile' })
    );
  });
  test('no mime type and name (with ext)', () => {
    expect(getDownloadHeadersForFile({ file, fileName: 'myfile.png' })).toEqual(
      expectHeaders({ contentType: 'image/png', contentDisposition: 'myfile.png' })
    );
  });
  test('mime type and no name', () => {
    const fileWithMime = { data: { ...file.data, mimeType: 'application/pdf' } } as File;
    expect(getDownloadHeadersForFile({ file: fileWithMime, fileName: undefined })).toEqual(
      expectHeaders({ contentType: 'application/pdf', contentDisposition: 'test' })
    );
  });
  test('mime type and name', () => {
    const fileWithMime = { data: { ...file.data, mimeType: 'application/pdf' } } as File;
    expect(getDownloadHeadersForFile({ file: fileWithMime, fileName: 'a cool file.pdf' })).toEqual(
      expectHeaders({ contentType: 'application/pdf', contentDisposition: 'a cool file.pdf' })
    );
  });
});
