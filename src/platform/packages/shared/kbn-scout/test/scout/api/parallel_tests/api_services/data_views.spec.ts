/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags } from '../../../../../src/playwright';
import { expect } from '../../../../../api';

apiTest.describe(
  'Data Views API Service',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
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
      const { data: dataViews, status } = await apiServices.dataViews.getAll();

      expect(status).toBe(200);
      expect(Array.isArray(dataViews)).toBe(true);
      expect(dataViews.length).toBeGreaterThan(0);

      // Verify our test data view is in the list
      const foundDataView = dataViews.find((dv) => dv.id === dataViewId);
      expect(foundDataView).toBeDefined();
      expect(foundDataView?.title).toBe(dataViewTitle);
    });

    apiTest('should get a single data view by ID with get()', async ({ apiServices }) => {
      const { data: dataView, status } = await apiServices.dataViews.get(dataViewId);

      expect(status).toBe(200);
      expect(dataView.id).toBe(dataViewId);
      expect(dataView.title).toBe(dataViewTitle);
      expect(dataView.version).toBeDefined();
    });

    apiTest('should handle get() for non-existent data view', async ({ apiServices }) => {
      const nonExistentId = `non-existent-${Date.now()}`;

      const { status } = await apiServices.dataViews.get(nonExistentId);

      // Should return 404 due to ignoreErrors
      expect(status).toBe(404);
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
      const { status } = await apiServices.dataViews.delete(tempId);

      expect(status).toBe(200);

      // Verify it's deleted by trying to get it
      const { status: getStatus } = await apiServices.dataViews.get(tempId);
      expect(getStatus).toBe(404);
    });

    apiTest('should handle delete() for non-existent data view', async ({ apiServices }) => {
      const nonExistentId = `non-existent-${Date.now()}`;

      const { status } = await apiServices.dataViews.delete(nonExistentId);

      // Should return 404 due to ignoreErrors
      expect(status).toBe(404);
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
          const { data: foundDataViews, status } = await apiServices.dataViews.find((dv) =>
            dv.title.includes('test-find-alpha')
          );

          expect(status).toBe(200);
          expect(foundDataViews.length).toBeGreaterThan(0);

          const matchingDataView = foundDataViews.find((dv) => dv.id === id1);
          expect(matchingDataView).toBeDefined();
          expect(matchingDataView?.title).toBe(title1);

          // Verify the other data view is NOT in the results
          const nonMatchingDataView = foundDataViews.find((dv) => dv.id === id2);
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
        const { data: foundDataViews, status } = await apiServices.dataViews.find(
          (dv) => dv.title === 'this-will-never-match-anything-12345'
        );

        expect(status).toBe(200);
        expect(foundDataViews).toMatchObject([]);
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
        const { status } = await apiServices.dataViews.deleteByTitle(tempTitle);

        expect(status).toBe(200);

        // Verify it's deleted
        const { status: getStatus } = await apiServices.dataViews.get(tempId);
        expect(getStatus).toBe(404);
      }
    );

    apiTest(
      'should return 200 when deleteByTitle() is called with non-existent title',
      async ({ apiServices }) => {
        const nonExistentTitle = `non-existent-title-${Date.now()}`;

        const { status } = await apiServices.dataViews.deleteByTitle(nonExistentTitle);

        // Should return 200 (not an error condition)
        expect(status).toBe(200);
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
          const { status } = await apiServices.dataViews.deleteByTitle(sharedTitle);
          expect(status).toBe(200);

          // Check which ones still exist
          const { status: status1 } = await apiServices.dataViews.get(id1);
          const { status: status2 } = await apiServices.dataViews.get(id2);

          // One should be deleted (404) and one should still exist (200)
          const statuses = [status1, status2].sort();
          expect(statuses).toMatchObject([200, 404]);
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
        const { data: allDataViews } = await apiServices.dataViews.getAll();
        const foundDataViews = allDataViews.filter((dv) => createdIds.includes(dv.id));
        expect(foundDataViews).toHaveLength(3);

        // Find with predicate
        const { data: filteredDataViews } = await apiServices.dataViews.find((dv) =>
          dv.title.includes('multi-test')
        );
        expect(filteredDataViews.length).toBeGreaterThan(2);

        // Delete one by ID
        const { status: deleteStatus } = await apiServices.dataViews.delete(createdIds[0]);
        expect(deleteStatus).toBe(200);

        // Delete one by title
        const { status: deleteByTitleStatus } = await apiServices.dataViews.deleteByTitle(
          titles[1]
        );
        expect(deleteByTitleStatus).toBe(200);

        // Verify only one remains
        const { data: remainingDataViews } = await apiServices.dataViews.find((dv) =>
          createdIds.includes(dv.id)
        );
        expect(remainingDataViews).toHaveLength(1);
        expect(remainingDataViews[0].id).toBe(createdIds[2]);
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
        const { status: firstDeleteStatus } = await apiServices.dataViews.delete(tempId);
        expect(firstDeleteStatus).toBe(200);

        // Delete it again (should not throw due to ignoreErrors)
        const { status: secondDeleteStatus } = await apiServices.dataViews.delete(tempId);
        expect(secondDeleteStatus).toBe(404);
      }
    );

    apiTest(
      'should handle deleteByTitle() when called twice',
      async ({ apiServices, kbnClient }) => {
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
        const { status: firstStatus } = await apiServices.dataViews.deleteByTitle(tempTitle);
        expect(firstStatus).toBe(200);

        // Delete by title second time (should return 200, not an error)
        const { status: secondStatus } = await apiServices.dataViews.deleteByTitle(tempTitle);
        expect(secondStatus).toBe(200);
      }
    );
  }
);
