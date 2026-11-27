/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import { FileKindsRegistryImpl } from '../../common/file_kinds_registry';
import { apiRoutes, createFilesClient } from './files_client';

describe('apiRoutes', () => {
  test('generates expected paths', () => {
    expect(apiRoutes.getCreateFileRoute('test')).toMatchInlineSnapshot(`"/api/files/files/test"`);

    expect(apiRoutes.getUploadRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/files/test/123/blob"`
    );

    expect(apiRoutes.getDownloadRoute('test', '123', 'my-file.png')).toMatchInlineSnapshot(
      `"/api/files/files/test/123/blob/my-file.png"`
    );

    expect(apiRoutes.getUpdateRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/files/test/123"`
    );

    expect(apiRoutes.getDeleteRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/files/test/123"`
    );

    expect(apiRoutes.getListRoute('test')).toMatchInlineSnapshot(`"/api/files/files/test/list"`);

    expect(apiRoutes.getByIdRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/files/test/123"`
    );

    expect(apiRoutes.getShareRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/shares/test/123"`
    );

    expect(apiRoutes.getListSharesRoute('test')).toMatchInlineSnapshot(`"/api/files/shares/test"`);

    expect(apiRoutes.getPublicDownloadRoute('my-file.pdf')).toMatchInlineSnapshot(
      `"/api/files/public/blob/my-file.pdf"`
    );

    expect(apiRoutes.getFindRoute()).toMatchInlineSnapshot(`"/api/files/find"`);

    expect(apiRoutes.getMetricsRoute()).toMatchInlineSnapshot(`"/api/files/metrics"`);
  });
});

describe('encoded route parameters', () => {
  const value = '../a?b#c%/café';
  const encoded = '..%2Fa%3Fb%23c%25%2Fcaf%C3%A9';

  test('encodes every file kind and ID', () => {
    expect(apiRoutes.getCreateFileRoute(value)).toBe(`/api/files/files/${encoded}`);
    expect(apiRoutes.getUploadRoute(value, value)).toBe(
      `/api/files/files/${encoded}/${encoded}/blob`
    );
    expect(apiRoutes.getDownloadRoute(value, value, value)).toBe(
      `/api/files/files/${encoded}/${encoded}/blob/${encoded}`
    );
    expect(apiRoutes.getUpdateRoute(value, value)).toBe(`/api/files/files/${encoded}/${encoded}`);
    expect(apiRoutes.getDeleteRoute(value, value)).toBe(`/api/files/files/${encoded}/${encoded}`);
    expect(apiRoutes.getListRoute(value)).toBe(`/api/files/files/${encoded}/list`);
    expect(apiRoutes.getByIdRoute(value, value)).toBe(`/api/files/files/${encoded}/${encoded}`);
    expect(apiRoutes.getShareRoute(value, value)).toBe(`/api/files/shares/${encoded}/${encoded}`);
    expect(apiRoutes.getListSharesRoute(value)).toBe(`/api/files/shares/${encoded}`);
    expect(apiRoutes.getPublicDownloadRoute(value)).toBe(`/api/files/public/blob/${encoded}`);
  });

  test.each([undefined, ''])('omits an absent or empty filename (%s)', (fileName) => {
    expect(apiRoutes.getDownloadRoute('kind', 'id', fileName)).toBe(
      '/api/files/files/kind/id/blob'
    );
    expect(apiRoutes.getPublicDownloadRoute(fileName)).toBe('/api/files/public/blob');
  });
});

describe('file client download paths', () => {
  test.each([undefined, 'scoped-kind'])('encodes downloads with scope %s', async (fileKind) => {
    const http = httpServiceMock.createStartContract({ basePath: '/base' });
    const registry = new FileKindsRegistryImpl<FileKindBrowser>();
    const client = fileKind
      ? createFilesClient({ http, registry, fileKind })
      : createFilesClient({ http, registry });
    const kind = fileKind ?? 'requested-kind';
    await client.download({ kind: 'requested-kind', id: '../id?', fileName: 'my file#%2F.png' });
    expect(http.get).toHaveBeenCalledWith(
      `/api/files/files/${kind}/..%2Fid%3F/blob/my%20file%23%252F.png`,
      { headers: { Accept: '*/*' } }
    );
    expect(client.getDownloadHref({ fileKind: 'requested-kind', id: '../id?' })).toBe(
      `/base/api/files/files/${kind}/..%2Fid%3F/blob`
    );
    await client.publicDownload({ token: 'token?', fileName: 'my file#%2F.png' });
    expect(http.get).toHaveBeenLastCalledWith('/api/files/public/blob/my%20file%23%252F.png', {
      query: { token: 'token?' },
    });
  });
});
