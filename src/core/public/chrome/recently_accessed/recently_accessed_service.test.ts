/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '../../http/http_service.mock';
import { RecentlyAccessedService } from './recently_accessed_service';
import { Subject } from 'rxjs';
import { takeUntil, bufferCount } from 'rxjs/operators';

// Maybe this should be moved to our global jest polyfills?
class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: any) {
    this.store.set(key, value.toString());
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  key(index: number) {
    return [...this.store.keys()][index] || null;
  }

  public get length() {
    return this.store.size;
  }
}

describe('RecentlyAccessed#start()', () => {
  let originalLocalStorage: Storage;
  beforeAll(() => {
    originalLocalStorage = window.localStorage;
    window.localStorage = new LocalStorageMock();
  });
  beforeEach(() => localStorage.clear());
  afterAll(() => (window.localStorage = originalLocalStorage));

  const getStart = async () => {
    const http = httpServiceMock.createStartContract();
    const recentlyAccessed = await new RecentlyAccessedService().start({ http });
    return { http, recentlyAccessed };
  };

  it('allows adding and getting items', async () => {
    const { recentlyAccessed } = await getStart();
    recentlyAccessed.add('/app/item1', 'Item 1', 'item1');
    recentlyAccessed.add('/app/item2', 'Item 2', 'item2');
    expect(recentlyAccessed.get()).toEqual([
      { link: '/app/item2', label: 'Item 2', id: 'item2' },
      { link: '/app/item1', label: 'Item 1', id: 'item1' },
    ]);
  });

  it('persists data to localStorage', async () => {
    const { recentlyAccessed: ra1 } = await getStart();
    ra1.add('/app/item1', 'Item 1', 'item1');
    ra1.add('/app/item2', 'Item 2', 'item2');

    const { recentlyAccessed: ra2 } = await getStart();
    expect(ra2.get()).toEqual([
      { link: '/app/item2', label: 'Item 2', id: 'item2' },
      { link: '/app/item1', label: 'Item 1', id: 'item1' },
    ]);
  });

  it('de-duplicates the list', async () => {
    const { recentlyAccessed } = await getStart();
    recentlyAccessed.add('/app/item1', 'Item 1', 'item1');
    recentlyAccessed.add('/app/item2', 'Item 2', 'item2');
    recentlyAccessed.add('/app/item1', 'Item 1', 'item1');
    expect(recentlyAccessed.get()).toEqual([
      { link: '/app/item1', label: 'Item 1', id: 'item1' },
      { link: '/app/item2', label: 'Item 2', id: 'item2' },
    ]);
  });

  it('exposes an observable', async () => {
    const { recentlyAccessed } = await getStart();
    const stop$ = new Subject<void>();
    const observedValues$ = recentlyAccessed
      .get$()
      .pipe(bufferCount(3), takeUntil(stop$))
      .toPromise();
    recentlyAccessed.add('/app/item1', 'Item 1', 'item1');
    recentlyAccessed.add('/app/item2', 'Item 2', 'item2');
    stop$.next();

    expect(await observedValues$).toMatchInlineSnapshot(`
Array [
  Array [],
  Array [
    Object {
      "id": "item1",
      "label": "Item 1",
      "link": "/app/item1",
    },
  ],
  Array [
    Object {
      "id": "item2",
      "label": "Item 2",
      "link": "/app/item2",
    },
    Object {
      "id": "item1",
      "label": "Item 1",
      "link": "/app/item1",
    },
  ],
]
`);
  });
});
