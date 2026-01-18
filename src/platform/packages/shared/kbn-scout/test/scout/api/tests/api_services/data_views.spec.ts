/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '../../../../../src/playwright';
import { expect } from '../../../../../api';

apiTest.describe('Data Views API Service', { tag: ['@svlSecurity', '@ess'] }, () => {
  let dataViewId: string;
  let dataViewTitle: string;

  apiTest.beforeEach(async ({ kbnClient }) => {
    dataViewTitle = `test-data-view-${Date.now()}`;

    // Create a test data view using kbnClient
    const response = await kbnClient.request({
      method: 'POST',
      path: '/api/data_views/data_view',
      body: {
        data_view: {
          title: dataViewTitle,
          name: `Test Data View ${Date.now()}`,
        },
      },
    });

    const dataView = (response.data as any).data_view;
    dataViewId = dataView.id;
  });

  apiTest.afterEach(async ({ apiServices }) => {
    // Clean up test data view
    if (dataViewId) {
      await apiServices.dataViews.delete(dataViewId);
      dataViewId = '';
    }
  });

  apiTest('should get all data views with getAll()', async ({ apiServices }) => {
    const response = await apiServices.dataViews.getAll();

    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);

    // Verify our test data view is in the list
    const foundDataView = response.data.find((dv) => dv.id === dataViewId);
    expect(foundDataView).toBeDefined();
    expect(foundDataView?.title).toBe(dataViewTitle);
  });

  apiTest('should get a single data view by ID with get()', async ({ apiServices }) => {
    const response = await apiServices.dataViews.get(dataViewId);

    expect(response).toHaveStatusCode(200);
    expect(response).toHaveData({ id: dataViewId, title: dataViewTitle });
    expect(response.data.version).toBeDefined();
  });

  apiTest('should handle get() for non-existent data view', async ({ apiServices }) => {
    const nonExistentId = `non-existent-${Date.now()}`;

    const response = await apiServices.dataViews.get(nonExistentId);

    // Should return 404 due to ignoreErrors
    expect(response).toHaveStatusCode(404);
  });

  apiTest('should delete a data view with delete()', async ({ apiServices, kbnClient }) => {
    // Create an additional data view to delete
    const tempTitle = `temp-data-view-${Date.now()}`;
    const createResponse = await kbnClient.request({
      method: 'POST',
      path: '/api/data_views/data_view',
      body: {
        data_view: {
          title: tempTitle,
          name: `Temp Data View ${Date.now()}`,
        },
      },
    });
    const tempId = (createResponse.data as any).data_view.id;

    // Delete it
    const deleteResponse = await apiServices.dataViews.delete(tempId);

    expect(deleteResponse).toHaveStatusCode(200);

    // Verify it's deleted by trying to get it
    const getResponse = await apiServices.dataViews.get(tempId);
    expect(getResponse).toHaveStatusCode(404);
  });

  apiTest('should handle delete() for non-existent data view', async ({ apiServices }) => {
    const nonExistentId = `non-existent-${Date.now()}`;

    const response = await apiServices.dataViews.delete(nonExistentId);

    // Should return 404 due to ignoreErrors
    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'should find data views with a predicate using find()',
    async ({ apiServices, kbnClient }) => {
      // Create multiple data views with different titles
      const title1 = `test-find-alpha-${Date.now()}`;
      const title2 = `test-find-beta-${Date.now()}`;

      const createResponse1 = await kbnClient.request({
        method: 'POST',
        path: '/api/data_views/data_view',
        body: {
          data_view: {
            title: title1,
            name: 'Find Test Alpha',
          },
        },
      });

      const createResponse2 = await kbnClient.request({
        method: 'POST',
        path: '/api/data_views/data_view',
        body: {
          data_view: {
            title: title2,
            name: 'Find Test Beta',
          },
        },
      });

      const id1 = (createResponse1.data as any).data_view.id;
      const id2 = (createResponse2.data as any).data_view.id;

      try {
        // Find data views with titles containing "test-find-alpha"
        const response = await apiServices.dataViews.find((dv) =>
          dv.title.includes('test-find-alpha')
        );

        expect(response).toHaveStatusCode(200);
        expect(response.data.length).toBeGreaterThanOrEqual(1);

        const matchingDataView = response.data.find((dv) => dv.id === id1);
        expect(matchingDataView).toBeDefined();
        expect(matchingDataView?.title).toBe(title1);

        // Verify the other data view is NOT in the results
        const nonMatchingDataView = response.data.find((dv) => dv.id === id2);
        expect(nonMatchingDataView).toBeUndefined();
      } finally {
        // Clean up
        await apiServices.dataViews.delete(id1);
        await apiServices.dataViews.delete(id2);
      }
    }
  );

  apiTest(
    'should return empty array when find() predicate matches nothing',
    async ({ apiServices }) => {
      const response = await apiServices.dataViews.find(
        (dv) => dv.title === 'this-will-never-match-anything-12345'
      );

      expect(response).toHaveStatusCode(200);
      expect(response).toHaveData([], { exactMatch: true });
    }
  );

  apiTest(
    'should delete a data view by title with deleteByTitle()',
    async ({ apiServices, kbnClient }) => {
      const tempTitle = `test-delete-by-title-${Date.now()}`;

      // Create a data view
      const createResponse = await kbnClient.request({
        method: 'POST',
        path: '/api/data_views/data_view',
        body: {
          data_view: {
            title: tempTitle,
            name: `Delete By Title Test ${Date.now()}`,
          },
        },
      });
      const tempId = (createResponse.data as any).data_view.id;

      // Delete by title
      const deleteResponse = await apiServices.dataViews.deleteByTitle(tempTitle);

      expect(deleteResponse).toHaveStatusCode(200);

      // Verify it's deleted
      const getResponse = await apiServices.dataViews.get(tempId);
      expect(getResponse).toHaveStatusCode(404);
    }
  );

  apiTest(
    'should return 200 when deleteByTitle() is called with non-existent title',
    async ({ apiServices }) => {
      const nonExistentTitle = `non-existent-title-${Date.now()}`;

      const response = await apiServices.dataViews.deleteByTitle(nonExistentTitle);

      // Should return 200 (not an error condition)
      expect(response).toHaveStatusCode(200);
    }
  );

  apiTest(
    'should delete only the first matching data view when multiple have same title',
    async ({ apiServices, kbnClient }) => {
      const sharedTitle = `shared-title-${Date.now()}`;

      // Create two data views with the same title (edge case, but possible)
      const createResponse1 = await kbnClient.request({
        method: 'POST',
        path: '/api/data_views/data_view',
        body: {
          data_view: {
            title: sharedTitle,
            name: 'First Data View',
          },
        },
      });

      const createResponse2 = await kbnClient.request({
        method: 'POST',
        path: '/api/data_views/data_view',
        body: {
          data_view: {
            title: sharedTitle,
            name: 'Second Data View',
          },
        },
      });

      const id1 = (createResponse1.data as any).data_view.id;
      const id2 = (createResponse2.data as any).data_view.id;

      try {
        // Delete by title (should delete only the first one found)
        const deleteResponse = await apiServices.dataViews.deleteByTitle(sharedTitle);
        expect(deleteResponse).toHaveStatusCode(200);

        // Check which ones still exist
        const getResponse1 = await apiServices.dataViews.get(id1);
        const getResponse2 = await apiServices.dataViews.get(id2);

        // One should be deleted (404) and one should still exist (200)
        const statuses = [getResponse1.status, getResponse2.status].sort();
        expect(statuses).toStrictEqual([200, 404]);
      } finally {
        // Clean up any remaining data views
        await apiServices.dataViews.delete(id1);
        await apiServices.dataViews.delete(id2);
      }
    }
  );

  apiTest('should handle multiple data views operations', async ({ apiServices, kbnClient }) => {
    const createdIds: string[] = [];

    try {
      // Create multiple data views
      const titles = [
        `multi-test-1-${Date.now()}`,
        `multi-test-2-${Date.now()}`,
        `multi-test-3-${Date.now()}`,
      ];

      for (const title of titles) {
        const response = await kbnClient.request({
          method: 'POST',
          path: '/api/data_views/data_view',
          body: {
            data_view: {
              title,
              name: `Multi Test ${title}`,
            },
          },
        });
        createdIds.push((response.data as any).data_view.id);
      }

      // Get all and verify they exist
      const getAllResponse = await apiServices.dataViews.getAll();
      const foundDataViews = getAllResponse.data.filter((dv) => createdIds.includes(dv.id));
      expect(foundDataViews).toHaveLength(3);

      // Find with predicate
      const findResponse = await apiServices.dataViews.find((dv) =>
        dv.title.includes('multi-test')
      );
      expect(findResponse.data.length).toBeGreaterThanOrEqual(3);

      // Delete one by ID
      const deleteResponse = await apiServices.dataViews.delete(createdIds[0]);
      expect(deleteResponse).toHaveStatusCode(200);

      // Delete one by title
      const deleteByTitleResponse = await apiServices.dataViews.deleteByTitle(titles[1]);
      expect(deleteByTitleResponse).toHaveStatusCode(200);

      // Verify only one remains
      const remainingResponse = await apiServices.dataViews.find((dv) =>
        createdIds.includes(dv.id)
      );
      expect(remainingResponse.data).toHaveLength(1);
      expect(remainingResponse.data[0].id).toBe(createdIds[2]);
    } finally {
      // Clean up all created data views
      await Promise.all(createdIds.map((id) => apiServices.dataViews.delete(id)));
    }
  });

  apiTest(
    'should not throw error when deleting already deleted data view',
    async ({ apiServices, kbnClient }) => {
      const tempTitle = `error-test-${Date.now()}`;

      // Create a data view
      const createResponse = await kbnClient.request({
        method: 'POST',
        path: '/api/data_views/data_view',
        body: {
          data_view: {
            title: tempTitle,
            name: 'Error Test',
          },
        },
      });
      const tempId = (createResponse.data as any).data_view.id;

      // Delete it once
      const firstDeleteResponse = await apiServices.dataViews.delete(tempId);
      expect(firstDeleteResponse).toHaveStatusCode(200);

      // Delete it again (should not throw due to ignoreErrors)
      const secondDeleteResponse = await apiServices.dataViews.delete(tempId);
      expect(secondDeleteResponse).toHaveStatusCode(404);
    }
  );

  apiTest('should handle deleteByTitle() when called twice', async ({ apiServices, kbnClient }) => {
    const tempTitle = `duplicate-delete-test-${Date.now()}`;

    // Create a data view
    await kbnClient.request({
      method: 'POST',
      path: '/api/data_views/data_view',
      body: {
        data_view: {
          title: tempTitle,
          name: 'Duplicate Delete Test',
        },
      },
    });

    // Delete by title first time
    const firstResponse = await apiServices.dataViews.deleteByTitle(tempTitle);
    expect(firstResponse).toHaveStatusCode(200);

    // Delete by title second time (should return 200, not an error)
    const secondResponse = await apiServices.dataViews.deleteByTitle(tempTitle);
    expect(secondResponse).toHaveStatusCode(200);
  });
});
