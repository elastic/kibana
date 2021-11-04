/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'src/plugins/kibana_utils/common';
import { MemoryShortUrlStorage } from './memory_short_url_storage';

describe('.create()', () => {
  test('can create a new short URL', async () => {
    const storage = new MemoryShortUrlStorage();
    const now = Date.now();
    const url1 = await storage.create({
      accessCount: 0,
      createDate: now,
      accessDate: now,
      locator: {
        id: 'TEST_LOCATOR',
        version: '7.11',
        state: {
          foo: 'bar',
        },
      },
      slug: 'test-slug',
    });

    expect(url1.accessCount).toBe(0);
    expect(url1.createDate).toBe(now);
    expect(url1.accessDate).toBe(now);
    expect(url1.slug).toBe('test-slug');
    expect(url1.locator).toEqual({
      id: 'TEST_LOCATOR',
      version: '7.11',
      state: {
        foo: 'bar',
      },
    });
  });
});

describe('.update()', () => {
  test('can update an existing short URL', async () => {
    const storage = new MemoryShortUrlStorage();
    const now = Date.now();
    const url1 = await storage.create({
      accessCount: 0,
      createDate: now,
      accessDate: now,
      locator: {
        id: 'TEST_LOCATOR',
        version: '7.11',
        state: {
          foo: 'bar',
        },
      },
      slug: 'test-slug',
    });

    await storage.update(url1.id, {
      accessCount: 1,
    });

    const url2 = await storage.getById(url1.id);

    expect(url1.accessCount).toBe(0);
    expect(url2.data.accessCount).toBe(1);
  });

  test('throws when URL does not exist', async () => {
    const storage = new MemoryShortUrlStorage();
    const [, error] = await of(
      storage.update('DOES_NOT_EXIST', {
        accessCount: 1,
      })
    );

    expect(error).toBeInstanceOf(Error);
  });
});

describe('.getById()', () => {
  test('can fetch by ID a newly created short URL', async () => {
    const storage = new MemoryShortUrlStorage();
    const now = Date.now();
    const url1 = await storage.create({
      accessCount: 0,
      createDate: now,
      accessDate: now,
      locator: {
        id: 'TEST_LOCATOR',
        version: '7.11',
        state: {
          foo: 'bar',
        },
      },
      slug: 'test-slug',
    });
    const url2 = (await storage.getById(url1.id)).data;

    expect(url2.accessCount).toBe(0);
    expect(url1.createDate).toBe(now);
    expect(url1.accessDate).toBe(now);
    expect(url2.slug).toBe('test-slug');
    expect(url2.locator).toEqual({
      id: 'TEST_LOCATOR',
      version: '7.11',
      state: {
        foo: 'bar',
      },
    });
  });

  test('throws when URL does not exist', async () => {
    const storage = new MemoryShortUrlStorage();
    const now = Date.now();
    await storage.create({
      accessCount: 0,
      createDate: now,
      accessDate: now,
      locator: {
        id: 'TEST_LOCATOR',
        version: '7.11',
        state: {
          foo: 'bar',
        },
      },
      slug: 'test-slug',
    });
    const [, error] = await of(storage.getById('DOES_NOT_EXIST'));

    expect(error).toBeInstanceOf(Error);
  });
});

describe('.getBySlug()', () => {
  test('can fetch by slug a newly created short URL', async () => {
    const storage = new MemoryShortUrlStorage();
    const now = Date.now();
    const url1 = await storage.create({
      accessCount: 0,
      createDate: now,
      accessDate: now,
      locator: {
        id: 'TEST_LOCATOR',
        version: '7.11',
        state: {
          foo: 'bar',
        },
      },
      slug: 'test-slug',
    });
    const url2 = (await storage.getBySlug('test-slug')).data;

    expect(url2.accessCount).toBe(0);
    expect(url1.createDate).toBe(now);
    expect(url1.accessDate).toBe(now);
    expect(url2.slug).toBe('test-slug');
    expect(url2.locator).toEqual({
      id: 'TEST_LOCATOR',
      version: '7.11',
      state: {
        foo: 'bar',
      },
    });
  });

  test('throws when URL does not exist', async () => {
    const storage = new MemoryShortUrlStorage();
    const now = Date.now();
    await storage.create({
      accessCount: 0,
      createDate: now,
      accessDate: now,
      locator: {
        id: 'TEST_LOCATOR',
        version: '7.11',
        state: {
          foo: 'bar',
        },
      },
      slug: 'test-slug',
    });
    const [, error] = await of(storage.getBySlug('DOES_NOT_EXIST'));

    expect(error).toBeInstanceOf(Error);
  });
});

describe('.delete()', () => {
  test('can delete a newly created URL', async () => {
    const storage = new MemoryShortUrlStorage();
    const now = Date.now();
    const url1 = await storage.create({
      accessCount: 0,
      createDate: now,
      accessDate: now,
      locator: {
        id: 'TEST_LOCATOR',
        version: '7.11',
        state: {
          foo: 'bar',
        },
      },
      slug: 'test-slug',
    });

    const [, error1] = await of(storage.getById(url1.id));
    await storage.delete(url1.id);
    const [, error2] = await of(storage.getById(url1.id));

    expect(error1).toBe(undefined);
    expect(error2).toBeInstanceOf(Error);
  });
});
