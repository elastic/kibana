/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createBatcher } from './batcher';

test('createBatcher', async () => {
  const users = [
    { uid: '1', name: 'Alice' },
    { uid: '2', name: 'Bob' },
    { uid: '3', name: 'Charlie' },
  ];

  const fetcher = jest.fn(() => Promise.resolve(users));

  const batcher = createBatcher({
    fetcher,
    resolver: (_users, id) => _users.find((u) => u.uid === id)!,
  });

  const [u1, u2] = await Promise.all([batcher.fetch('1'), batcher.fetch('2')]);

  expect(u1).toEqual(users[0]);
  expect(u2).toEqual(users[1]);

  expect(fetcher).toHaveBeenCalledTimes(1);
});
