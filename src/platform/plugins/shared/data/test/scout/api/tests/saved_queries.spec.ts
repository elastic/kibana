/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { SavedQueryAttributes } from '../../../../common';
import { SAVED_QUERY_BASE_URL } from '../../../../common';
import { apiTest, COMMON_HEADERS } from '../fixtures';

const mockSavedQuery: SavedQueryAttributes = {
  title: 'my title',
  description: 'my description',
  query: {
    query: 'foo: bar',
    language: 'kql',
  },
  filters: [],
};

const titlesOf = (savedQueries: Array<{ attributes: { title: string } }>) =>
  savedQueries.map(({ attributes }) => attributes.title);

apiTest.describe('Saved queries API', { tag: tags.deploymentAgnostic }, () => {
  // The tests assert exact totals, so they run in their own space instead of the default one.
  const spaceId = `saved-queries-${randomUUID()}`;
  const baseUrl = `/s/${spaceId}${SAVED_QUERY_BASE_URL}`;
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, samlAuth, config }) => {
    await apiServices.spaces.create({ id: spaceId });

    // Same role selection as saved_query_shared_delete.spec.ts: savedQuery:read/manage is not granted to every role.
    const role = config.serverless && config.projectType === 'es' ? 'developer' : 'editor';
    const { cookieHeader } = await samlAuth.asInteractiveUser(role);
    headers = { ...COMMON_HEADERS, ...cookieHeader };
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['query'], space: spaceId });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(spaceId);
  });

  const createQuery = (apiClient: ApiClientFixture, body: object = mockSavedQuery) =>
    apiClient.post(`${baseUrl}/_create`, { headers, body });

  const updateQuery = (apiClient: ApiClientFixture, id: string, body: object = mockSavedQuery) =>
    apiClient.put(`${baseUrl}/${id}`, { headers, body });

  const getQuery = (apiClient: ApiClientFixture, id: string) =>
    apiClient.get(`${baseUrl}/${id}`, { headers });

  const deleteQuery = (apiClient: ApiClientFixture, id: string) =>
    apiClient.delete(`${baseUrl}/${id}`, { headers });

  const findQueries = (apiClient: ApiClientFixture, body: object = {}) =>
    apiClient.post(`${baseUrl}/_find`, { headers, body });

  const countQueries = (apiClient: ApiClientFixture) =>
    apiClient.get(`${baseUrl}/_count`, { headers, responseType: 'text' });

  const isDuplicateTitle = (apiClient: ApiClientFixture, title: string, id?: string) =>
    apiClient.post(`${baseUrl}/_is_duplicate_title`, {
      headers,
      body: { title, id },
    });

  apiTest('create: should return 200 for create saved query', async ({ apiClient }) => {
    const response = await createQuery(apiClient);
    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toHaveLength(36);
    expect(response.body.attributes.title).toBe('my title');
    expect(response.body.attributes.description).toBe('my description');
  });

  apiTest('create: should return 400 for create invalid saved query', async ({ apiClient }) => {
    const response = await createQuery(apiClient, { description: 'my description' });
    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.title]: expected value of type [string] but got [undefined]'
    );
  });

  apiTest(
    'create: should return 400 for create saved query with duplicate title',
    async ({ apiClient }) => {
      expect(await createQuery(apiClient)).toHaveStatusCode(200);
      const response = await createQuery(apiClient);
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe('Query with title "my title" already exists');
    }
  );

  apiTest(
    'create: should leave filters and timefilter undefined if not provided',
    async ({ apiClient }) => {
      const created = await createQuery(apiClient, {
        ...mockSavedQuery,
        filters: undefined,
        timefilter: undefined,
      });
      expect(created).toHaveStatusCode(200);
      const fetched = await getQuery(apiClient, created.body.id);
      expect(fetched).toHaveStatusCode(200);
      expect(created.body.attributes.filters).toBeUndefined();
      expect(created.body.attributes.timefilter).toBeUndefined();
      expect(fetched.body.attributes.filters).toBeUndefined();
      expect(fetched.body.attributes.timefilter).toBeUndefined();
    }
  );

  apiTest('update: should return 200 for update saved query', async ({ apiClient }) => {
    const created = await createQuery(apiClient);
    expect(created).toHaveStatusCode(200);
    const response = await updateQuery(apiClient, created.body.id, {
      ...mockSavedQuery,
      title: 'my updated title',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(created.body.id);
    expect(response.body.attributes.title).toBe('my updated title');
  });

  apiTest(
    'update: should return 404 for update non-existent saved query',
    async ({ apiClient }) => {
      const response = await updateQuery(apiClient, 'invalid_id');
      expect(response).toHaveStatusCode(404);
    }
  );

  apiTest(
    'update: should return 400 for update saved query with duplicate title',
    async ({ apiClient }) => {
      const created = await createQuery(apiClient);
      expect(created).toHaveStatusCode(200);
      expect(
        await createQuery(apiClient, { ...mockSavedQuery, title: 'my duplicate title' })
      ).toHaveStatusCode(200);
      const response = await updateQuery(apiClient, created.body.id, {
        ...mockSavedQuery,
        title: 'my duplicate title',
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe('Query with title "my duplicate title" already exists');
    }
  );

  apiTest('update: should remove filters and timefilter if not provided', async ({ apiClient }) => {
    const created = await createQuery(apiClient, {
      ...mockSavedQuery,
      filters: [{ meta: {}, query: {} }],
      timefilter: {
        from: 'now-7d',
        to: 'now',
        refreshInterval: { pause: false, value: 60000 },
      },
    });
    expect(created).toHaveStatusCode(200);
    expect(created.body.attributes.filters).toBeDefined();
    expect(created.body.attributes.timefilter).toBeDefined();

    const updated = await updateQuery(apiClient, created.body.id, {
      ...mockSavedQuery,
      filters: undefined,
      timefilter: undefined,
    });
    expect(updated).toHaveStatusCode(200);
    expect(updated.body.attributes.filters).toBeUndefined();
    expect(updated.body.attributes.timefilter).toBeUndefined();

    const fetched = await getQuery(apiClient, updated.body.id);
    expect(fetched).toHaveStatusCode(200);
    expect(fetched.body.attributes.filters).toBeUndefined();
    expect(fetched.body.attributes.timefilter).toBeUndefined();
  });

  apiTest('delete: should return 200 for delete saved query', async ({ apiClient }) => {
    const created = await createQuery(apiClient);
    expect(created).toHaveStatusCode(200);
    expect(await deleteQuery(apiClient, created.body.id)).toHaveStatusCode(200);
  });

  apiTest(
    'delete: should return 404 for delete non-existent saved query',
    async ({ apiClient }) => {
      expect(await deleteQuery(apiClient, 'invalid_id')).toHaveStatusCode(404);
    }
  );

  apiTest('get: should return 200 for get saved query', async ({ apiClient }) => {
    const created = await createQuery(apiClient);
    expect(created).toHaveStatusCode(200);
    const response = await getQuery(apiClient, created.body.id);
    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(created.body.id);
    expect(response.body.attributes.title).toBe(created.body.attributes.title);
  });

  apiTest('get: should return 404 for get non-existent saved query', async ({ apiClient }) => {
    expect(await getQuery(apiClient, 'invalid_id')).toHaveStatusCode(404);
  });

  apiTest('find: should return 200 for find saved queries', async ({ apiClient }) => {
    expect(await findQueries(apiClient)).toHaveStatusCode(200);
  });

  apiTest('find: should return 400 for bad find saved queries request', async ({ apiClient }) => {
    const response = await findQueries(apiClient, { foo: 'bar' });
    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      "[request body.foo]: Additional properties are not allowed ('foo' was unexpected)"
    );
  });

  apiTest('find: should return expected queries for find saved queries', async ({ apiClient }) => {
    expect(await createQuery(apiClient)).toHaveStatusCode(200);
    const second = await createQuery(apiClient, { ...mockSavedQuery, title: 'my title 2' });
    expect(second).toHaveStatusCode(200);

    const before = await findQueries(apiClient);
    expect(before).toHaveStatusCode(200);
    expect(before.body.total).toBe(2);
    expect(titlesOf(before.body.savedQueries)).toStrictEqual(['my title', 'my title 2']);

    expect(await deleteQuery(apiClient, second.body.id)).toHaveStatusCode(200);

    const after = await findQueries(apiClient);
    expect(after).toHaveStatusCode(200);
    expect(after.body.total).toBe(1);
    expect(titlesOf(after.body.savedQueries)).toStrictEqual(['my title']);
  });

  apiTest(
    'find: should return expected queries for find saved queries with a search',
    async ({ apiClient }) => {
      expect(await createQuery(apiClient)).toHaveStatusCode(200);
      expect(
        await createQuery(apiClient, { ...mockSavedQuery, title: 'my title 2' })
      ).toHaveStatusCode(200);
      const third = await createQuery(apiClient, {
        ...mockSavedQuery,
        title: 'my title 2 again',
      });
      expect(third).toHaveStatusCode(200);

      const before = await findQueries(apiClient, { search: 'itle 2' });
      expect(before).toHaveStatusCode(200);
      expect(before.body.total).toBe(2);
      expect(titlesOf(before.body.savedQueries)).toStrictEqual(['my title 2', 'my title 2 again']);

      expect(await deleteQuery(apiClient, third.body.id)).toHaveStatusCode(200);

      const after = await findQueries(apiClient, { search: 'itle 2' });
      expect(after).toHaveStatusCode(200);
      expect(after.body.total).toBe(1);
      expect(titlesOf(after.body.savedQueries)).toStrictEqual(['my title 2']);
    }
  );

  apiTest('find: should support pagination for find saved queries', async ({ apiClient }) => {
    expect(await createQuery(apiClient)).toHaveStatusCode(200);
    expect(
      await createQuery(apiClient, { ...mockSavedQuery, title: 'my title 2' })
    ).toHaveStatusCode(200);
    expect(
      await createQuery(apiClient, { ...mockSavedQuery, title: 'my title 3' })
    ).toHaveStatusCode(200);

    const page1 = await findQueries(apiClient, { perPage: 2 });
    expect(page1).toHaveStatusCode(200);
    expect(page1.body.total).toBe(3);
    expect(titlesOf(page1.body.savedQueries)).toStrictEqual(['my title', 'my title 2']);

    const page2 = await findQueries(apiClient, { perPage: 2, page: 2 });
    expect(page2).toHaveStatusCode(200);
    expect(page2.body.total).toBe(3);
    expect(titlesOf(page2.body.savedQueries)).toStrictEqual(['my title 3']);
  });

  apiTest(
    'find: should support pagination for find saved queries with a search',
    async ({ apiClient }) => {
      expect(await createQuery(apiClient)).toHaveStatusCode(200);
      for (const title of ['my title 2', 'my title 3', 'not a match']) {
        expect(await createQuery(apiClient, { ...mockSavedQuery, title })).toHaveStatusCode(200);
      }

      const page1 = await findQueries(apiClient, { perPage: 2, search: 'itle' });
      expect(page1).toHaveStatusCode(200);
      expect(page1.body.total).toBe(3);
      expect(titlesOf(page1.body.savedQueries)).toStrictEqual(['my title', 'my title 2']);

      const page2 = await findQueries(apiClient, { perPage: 2, page: 2, search: 'itle' });
      expect(page2).toHaveStatusCode(200);
      expect(page2.body.total).toBe(3);
      expect(titlesOf(page2.body.savedQueries)).toStrictEqual(['my title 3']);
    }
  );

  apiTest(
    'find: should support searching for queries containing special characters',
    async ({ apiClient }) => {
      expect(
        await createQuery(apiClient, { ...mockSavedQuery, title: 'query <> title' })
      ).toHaveStatusCode(200);

      const response = await findQueries(apiClient, { search: 'ry <> ti' });
      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(1);
      expect(titlesOf(response.body.savedQueries)).toStrictEqual(['query <> title']);
    }
  );

  apiTest('count: should return 200 for saved query count', async ({ apiClient }) => {
    expect(await countQueries(apiClient)).toHaveStatusCode(200);
  });

  apiTest('count: should return expected counts for saved query count', async ({ apiClient }) => {
    const empty = await countQueries(apiClient);
    expect(empty).toHaveStatusCode(200);
    expect(empty.body).toBe('0');

    expect(await createQuery(apiClient)).toHaveStatusCode(200);
    const second = await createQuery(apiClient, { ...mockSavedQuery, title: 'my title 2' });
    expect(second).toHaveStatusCode(200);

    expect((await countQueries(apiClient)).body).toBe('2');

    expect(await deleteQuery(apiClient, second.body.id)).toHaveStatusCode(200);

    expect((await countQueries(apiClient)).body).toBe('1');
  });

  apiTest(
    'isDuplicateTitle: should return isDuplicate = true for _is_duplicate_title check with a duplicate title',
    async ({ apiClient }) => {
      const created = await createQuery(apiClient);
      expect(created).toHaveStatusCode(200);
      const response = await isDuplicateTitle(apiClient, created.body.attributes.title);
      expect(response).toHaveStatusCode(200);
      expect(response.body.isDuplicate).toBe(true);
    }
  );

  apiTest(
    'isDuplicateTitle: should return isDuplicate = false for _is_duplicate_title check with a duplicate title and matching ID',
    async ({ apiClient }) => {
      const created = await createQuery(apiClient);
      expect(created).toHaveStatusCode(200);
      const response = await isDuplicateTitle(
        apiClient,
        created.body.attributes.title,
        created.body.id
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.isDuplicate).toBe(false);
    }
  );

  apiTest(
    'isDuplicateTitle: should return isDuplicate = false for _is_duplicate_title check with a unique title',
    async ({ apiClient }) => {
      expect(await createQuery(apiClient)).toHaveStatusCode(200);
      const response = await isDuplicateTitle(apiClient, 'my unique title');
      expect(response).toHaveStatusCode(200);
      expect(response.body.isDuplicate).toBe(false);
    }
  );
});
