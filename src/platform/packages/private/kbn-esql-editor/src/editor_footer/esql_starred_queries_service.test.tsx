/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlStarredQueriesService } from './esql_starred_queries_service';
import { coreMock } from '@kbn/core/public/mocks';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

class LocalStorageMock {
  public store: Record<string, unknown>;
  constructor(defaultStore: Record<string, unknown>) {
    this.store = defaultStore;
  }
  clear() {
    this.store = {};
  }
  get(key: string) {
    return this.store[key] || null;
  }
  set(key: string, value: unknown) {
    this.store[key] = String(value);
  }
  remove(key: string) {
    delete this.store[key];
  }
}

describe('EsqlStarredQueriesService', () => {
  const core = coreMock.createStart();
  const storage = new LocalStorageMock({}) as unknown as Storage;

  it('should initialize', async () => {
    const service = await EsqlStarredQueriesService.initialize({
      http: core.http,
      storage,
    });
    expect(service).toBeDefined();
    expect(service.queries$.value).toEqual([]);
  });

  it('should add a new starred query', async () => {
    const service = await EsqlStarredQueriesService.initialize({
      http: core.http,
      storage,
    });
    const query = {
      queryString: 'SELECT * FROM test',
      timeRan: '2021-09-01T00:00:00Z',
      status: 'success' as const,
    };

    await service.addStarredQuery(query);
    expect(service.queries$.value).toEqual([
      {
        id: expect.any(String),
        ...query,
        // stores now()
        timeRan: expect.any(String),
      },
    ]);
  });

  it('should not add the same query twice', async () => {
    const service = await EsqlStarredQueriesService.initialize({
      http: core.http,
      storage,
    });
    const query = {
      queryString: 'SELECT * FROM   test',
      timeRan: '2021-09-01T00:00:00Z',
      status: 'success' as const,
    };

    const expected = {
      id: expect.any(String),
      ...query,
      // stores now()
      timeRan: expect.any(String),
      // trimmed query
      queryString: 'SELECT * FROM test',
    };

    await service.addStarredQuery(query);
    expect(service.queries$.value).toEqual([expected]);

    // second time
    await service.addStarredQuery(query);
    expect(service.queries$.value).toEqual([expected]);
  });

  it('should add the query trimmed', async () => {
    const service = await EsqlStarredQueriesService.initialize({
      http: core.http,
      storage,
    });
    const query = {
      queryString: `SELECT * FROM test |
        WHERE field != 'value'`,
      timeRan: '2021-09-01T00:00:00Z',
      status: 'error' as const,
    };

    await service.addStarredQuery(query);
    expect(service.queries$.value).toEqual([
      {
        id: expect.any(String),
        ...query,
        timeRan: expect.any(String),
        // trimmed query
        queryString: `SELECT * FROM test | WHERE field != 'value'`,
      },
    ]);
  });

  it('should remove a query', async () => {
    const service = await EsqlStarredQueriesService.initialize({
      http: core.http,
      storage,
    });
    const query = {
      queryString: `SELECT * FROM test | WHERE field != 'value'`,
      timeRan: '2021-09-01T00:00:00Z',
      status: 'error' as const,
    };

    await service.addStarredQuery(query);
    expect(service.queries$.value).toEqual([
      {
        id: expect.any(String),
        ...query,
        timeRan: expect.any(String),
        // trimmed query
        queryString: `SELECT * FROM test | WHERE field != 'value'`,
      },
    ]);

    await service.removeStarredQuery(query.queryString);
    expect(service.queries$.value).toEqual([]);
  });

  it('should return the button correctly', async () => {
    const service = await EsqlStarredQueriesService.initialize({
      http: core.http,
      storage,
    });
    const query = {
      queryString: 'SELECT * FROM test',
      timeRan: '2021-09-01T00:00:00Z',
      status: 'success' as const,
    };

    await service.addStarredQuery(query);
    const buttonWithTooltip = service.renderStarredButton(query);
    const button = buttonWithTooltip.props.children;
    expect(button.props.title).toEqual('Remove ES|QL query from Starred');
    expect(button.props.iconType).toEqual('starFilled');
  });

  it('should display the modal when the Remove button is clicked', async () => {
    const service = await EsqlStarredQueriesService.initialize({
      http: core.http,
      storage,
    });
    const query = {
      queryString: 'SELECT * FROM test',
      timeRan: '2021-09-01T00:00:00Z',
      status: 'success' as const,
    };

    await service.addStarredQuery(query);
    const buttonWithTooltip = service.renderStarredButton(query);
    const button = buttonWithTooltip.props.children;
    expect(button.props.title).toEqual('Remove ES|QL query from Starred');
    button.props.onClick();

    expect(service.discardModalVisibility$.value).toEqual(true);
  });

  it('should NOT display the modal when Remove the button is clicked but the user has dismissed the modal permanently', async () => {
    storage.set('esqlEditor.starredQueriesDiscard', true);
    const service = await EsqlStarredQueriesService.initialize({
      http: core.http,
      storage,
    });
    const query = {
      queryString: 'SELECT * FROM test',
      timeRan: '2021-09-01T00:00:00Z',
      status: 'success' as const,
    };

    await service.addStarredQuery(query);
    const buttonWithTooltip = service.renderStarredButton(query);
    const button = buttonWithTooltip.props.children;
    button.props.onClick();

    expect(service.discardModalVisibility$.value).toEqual(false);
  });
});
