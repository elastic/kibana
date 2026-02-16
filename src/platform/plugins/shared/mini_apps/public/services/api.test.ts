/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { createMiniAppsApiClient } from './api';
import { MINI_APPS_API_BASE } from '../../common';

describe('MiniAppsApiClient', () => {
  let httpMock: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    httpMock = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<HttpSetup>;
  });

  describe('list', () => {
    it('should call http.get with the correct URL', async () => {
      const mockResponse = { items: [], total: 0 };
      httpMock.get.mockResolvedValue(mockResponse);

      const client = createMiniAppsApiClient(httpMock);
      const result = await client.list();

      expect(httpMock.get).toHaveBeenCalledWith(MINI_APPS_API_BASE);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('get', () => {
    it('should call http.get with the correct URL including encoded ID', async () => {
      const mockApp = {
        id: 'test-id',
        name: 'Test App',
        script_code: 'console.log("test")',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      httpMock.get.mockResolvedValue(mockApp);

      const client = createMiniAppsApiClient(httpMock);
      const result = await client.get('test-id');

      expect(httpMock.get).toHaveBeenCalledWith(`${MINI_APPS_API_BASE}/test-id`);
      expect(result).toEqual(mockApp);
    });

    it('should encode special characters in ID', async () => {
      httpMock.get.mockResolvedValue({});

      const client = createMiniAppsApiClient(httpMock);
      await client.get('test/id with spaces');

      expect(httpMock.get).toHaveBeenCalledWith(
        `${MINI_APPS_API_BASE}/${encodeURIComponent('test/id with spaces')}`
      );
    });
  });

  describe('create', () => {
    it('should call http.post with the correct URL and body', async () => {
      const createRequest = {
        name: 'New App',
        script_code: 'console.log("new")',
      };
      const mockResponse = {
        id: 'new-id',
        ...createRequest,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      httpMock.post.mockResolvedValue(mockResponse);

      const client = createMiniAppsApiClient(httpMock);
      const result = await client.create(createRequest);

      expect(httpMock.post).toHaveBeenCalledWith(MINI_APPS_API_BASE, {
        body: JSON.stringify(createRequest),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should call http.put with the correct URL and body', async () => {
      const updateRequest = {
        name: 'Updated App',
        script_code: 'console.log("updated")',
      };
      const mockResponse = {
        id: 'test-id',
        ...updateRequest,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };
      httpMock.put.mockResolvedValue(mockResponse);

      const client = createMiniAppsApiClient(httpMock);
      const result = await client.update('test-id', updateRequest);

      expect(httpMock.put).toHaveBeenCalledWith(`${MINI_APPS_API_BASE}/test-id`, {
        body: JSON.stringify(updateRequest),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('should call http.delete with the correct URL', async () => {
      httpMock.delete.mockResolvedValue({ success: true });

      const client = createMiniAppsApiClient(httpMock);
      await client.delete('test-id');

      expect(httpMock.delete).toHaveBeenCalledWith(`${MINI_APPS_API_BASE}/test-id`);
    });
  });
});
