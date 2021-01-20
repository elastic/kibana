/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

jest.mock('fs');

import { getMtimes } from './get_mtimes';

const { stat }: { stat: jest.Mock } = jest.requireMock('fs');

it('returns mtimes Map', async () => {
  stat.mockImplementation((path, cb) => {
    if (path.includes('missing')) {
      const error = new Error('file not found');
      (error as any).code = 'ENOENT';
      cb(error);
    } else {
      cb(null, {
        mtimeMs: 1234,
      });
    }
  });

  await expect(getMtimes(['/foo/bar', '/foo/missing', '/foo/baz', '/foo/bar'])).resolves
    .toMatchInlineSnapshot(`
    Map {
      "/foo/bar" => 1234,
      "/foo/baz" => 1234,
    }
  `);
});
