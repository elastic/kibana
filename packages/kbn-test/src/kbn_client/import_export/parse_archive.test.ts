/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseArchive } from './parse_archive';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockReadFile = jest.requireMock('fs/promises').readFile;

beforeEach(() => {
  jest.clearAllMocks();
});

it('parses archives with \\n', async () => {
  mockReadFile.mockResolvedValue(
    `{
      "foo": "abc"
    }\n\n{
      "foo": "xyz"
    }`
  );

  const archive = await parseArchive('mock');
  expect(archive).toMatchInlineSnapshot(`
    Array [
      Object {
        "foo": "abc",
      },
      Object {
        "foo": "xyz",
      },
    ]
  `);
});

it('parses archives with \\r\\n', async () => {
  mockReadFile.mockResolvedValue(
    `{
      "foo": "123"
    }\r\n\r\n{
      "foo": "456"
    }`
  );

  const archive = await parseArchive('mock');
  expect(archive).toMatchInlineSnapshot(`
    Array [
      Object {
        "foo": "123",
      },
      Object {
        "foo": "456",
      },
    ]
  `);
});
