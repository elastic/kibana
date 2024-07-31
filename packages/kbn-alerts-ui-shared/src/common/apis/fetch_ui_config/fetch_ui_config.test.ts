/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchUiConfig } from '.';

describe('fetchUiConfig', () => {
  const http = httpServiceMock.createStartContract();

  test('should call fetchUiConfig API', async () => {
    const result = await fetchUiConfig({ http });
    expect(result).toEqual(undefined);
    expect(http.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/internal/triggers_actions_ui/_config",
        ],
      ]
    `);
  });
});
