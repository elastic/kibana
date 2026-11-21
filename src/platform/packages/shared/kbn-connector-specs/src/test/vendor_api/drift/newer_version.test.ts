/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findNewerVersion } from './newer_version';

describe('findNewerVersion', () => {
  const source = {
    url: 'https://vendor.example.com/network/v10.4.57/openapi.json',
    latest: { url: 'https://vendor.example.com/network/', pattern: '/network/(v\\d+(?:\\.\\d+)+)' },
  };

  it('returns the highest version the page names when it is above the URL’s', async () => {
    const page = 'a /network/v9.0.1/x, /network/v11.0.97/y and /network/v10.4.57/z';

    expect(await findNewerVersion(source, async () => page)).toEqual({
      current: 'v10.4.57',
      latest: 'v11.0.97',
    });
  });

  it('compares versions by number, not alphabetically', async () => {
    expect(await findNewerVersion(source, async () => '/network/v10.10.0/x')).toEqual({
      current: 'v10.4.57',
      latest: 'v10.10.0',
    });
  });

  it('returns nothing when the URL is at the highest version', async () => {
    expect(
      await findNewerVersion(source, async () => '/network/v10.4.57/x /network/v9.0.1/x')
    ).toBeUndefined();
  });

  it('throws when the page names no version, which means the page changed', async () => {
    await expect(findNewerVersion(source, async () => 'nothing here')).rejects.toThrow(
      /finds no version in https:\/\/vendor.example.com\/network\//
    );
  });

  it('throws when the pattern finds no version in the URL', async () => {
    await expect(
      findNewerVersion(
        { ...source, url: 'https://vendor.example.com/openapi.json' },
        async () => ''
      )
    ).rejects.toThrow(/finds no version in https:\/\/vendor.example.com\/openapi.json/);
  });
});
