/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiRoutes } from './files_client';

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
