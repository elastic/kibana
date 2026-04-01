/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GoogleCloudStorageConnector } from './google_cloud_storage';

describe('GoogleCloudStorageConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: {},
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have the correct connector ID', () => {
      expect(GoogleCloudStorageConnector.metadata.id).toBe('.google_cloud_storage');
    });

    it('should require enterprise license', () => {
      expect(GoogleCloudStorageConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('should be marked as technical preview', () => {
      expect(GoogleCloudStorageConnector.metadata.isTechnicalPreview).toBe(true);
    });

    it('should support workflows and agentBuilder features', () => {
      expect(GoogleCloudStorageConnector.metadata.supportedFeatureIds).toContain('workflows');
      expect(GoogleCloudStorageConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
    });
  });

  describe('auth', () => {
    it('should support bearer auth', () => {
      expect(GoogleCloudStorageConnector.auth?.types).toContain('bearer');
    });

    it('should support oauth_authorization_code with correct Google defaults', () => {
      const oauthType = GoogleCloudStorageConnector.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      );
      expect(oauthType).toBeDefined();
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scope:
            'https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/cloudplatformprojects.readonly',
        },
      });
    });
  });

  describe('agentBuilderWorkflows', () => {
    it('should define 5 workflows', () => {
      expect(GoogleCloudStorageConnector.agentBuilderWorkflows).toHaveLength(5);
    });
  });

  describe('listProjects action', () => {
    it('should return raw API response', async () => {
      const mockResponseData = {
        projects: [
          {
            projectId: 'my-project',
            name: 'My Project',
            lifecycleState: 'ACTIVE',
            createTime: '2024-01-01T00:00:00.000Z',
            projectNumber: '123456',
            parent: { type: 'organization', id: '999' },
          },
        ],
        nextPageToken: undefined,
      };
      mockClient.get.mockResolvedValue({ data: mockResponseData });

      const result = await GoogleCloudStorageConnector.actions.listProjects.handler(
        mockContext,
        {}
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://cloudresourcemanager.googleapis.com/v1/projects',
        { params: { pageSize: 100 } }
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should include filter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: { projects: [] } });

      await GoogleCloudStorageConnector.actions.listProjects.handler(mockContext, {
        filter: 'lifecycleState:ACTIVE',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://cloudresourcemanager.googleapis.com/v1/projects',
        expect.objectContaining({
          params: expect.objectContaining({ filter: 'lifecycleState:ACTIVE' }),
        })
      );
    });

    it('should throw GCS API error', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { error: { message: 'Permission denied', code: 403 } } },
      });

      await expect(
        GoogleCloudStorageConnector.actions.listProjects.handler(mockContext, {})
      ).rejects.toThrow('Google Cloud Storage API error (403)');
    });
  });

  describe('listBuckets action', () => {
    it('should return raw API response', async () => {
      const mockResponseData = {
        kind: 'storage#buckets',
        items: [
          {
            kind: 'storage#bucket',
            id: 'my-project/my-bucket',
            name: 'my-bucket',
            location: 'US',
            storageClass: 'STANDARD',
            timeCreated: '2024-01-01T00:00:00.000Z',
            updated: '2024-06-01T00:00:00.000Z',
            selfLink: 'https://storage.googleapis.com/storage/v1/b/my-bucket',
            projectNumber: '123456',
          },
        ],
        nextPageToken: undefined,
      };
      mockClient.get.mockResolvedValue({ data: mockResponseData });

      const result = await GoogleCloudStorageConnector.actions.listBuckets.handler(mockContext, {
        project: 'my-project',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://storage.googleapis.com/storage/v1/b', {
        params: { project: 'my-project', maxResults: 100 },
      });
      expect(result).toEqual(mockResponseData);
    });

    it('should include prefix filter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [] } });

      await GoogleCloudStorageConnector.actions.listBuckets.handler(mockContext, {
        project: 'my-project',
        prefix: 'staging-',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b',
        expect.objectContaining({
          params: expect.objectContaining({ prefix: 'staging-' }),
        })
      );
    });

    it('should include pageToken when provided', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [] } });

      await GoogleCloudStorageConnector.actions.listBuckets.handler(mockContext, {
        project: 'my-project',
        pageToken: 'token-abc',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b',
        expect.objectContaining({
          params: expect.objectContaining({ pageToken: 'token-abc' }),
        })
      );
    });

    it('should cap maxResults at 1000', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [] } });

      await GoogleCloudStorageConnector.actions.listBuckets.handler(mockContext, {
        project: 'my-project',
        maxResults: 9999,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b',
        expect.objectContaining({
          params: expect.objectContaining({ maxResults: 1000 }),
        })
      );
    });

    it('should throw GCS API error', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { error: { message: 'Permission denied', code: 403 } } },
      });

      await expect(
        GoogleCloudStorageConnector.actions.listBuckets.handler(mockContext, {
          project: 'my-project',
        })
      ).rejects.toThrow('Google Cloud Storage API error (403)');
    });
  });

  describe('listObjects action', () => {
    it('should return raw API response', async () => {
      const mockResponseData = {
        kind: 'storage#objects',
        items: [
          {
            kind: 'storage#object',
            id: 'my-bucket/reports/jan.pdf/1234',
            name: 'reports/jan.pdf',
            bucket: 'my-bucket',
            size: '2048',
            contentType: 'application/pdf',
            timeCreated: '2024-01-01T00:00:00.000Z',
            updated: '2024-01-01T00:00:00.000Z',
            md5Hash: 'abc123',
            selfLink: 'https://storage.googleapis.com/...',
            mediaLink: 'https://storage.googleapis.com/download/...',
            generation: '1234',
            metageneration: '1',
          },
        ],
        prefixes: ['reports/'],
        nextPageToken: undefined,
      };
      mockClient.get.mockResolvedValue({ data: mockResponseData });

      const result = await GoogleCloudStorageConnector.actions.listObjects.handler(mockContext, {
        bucket: 'my-bucket',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b/my-bucket/o',
        { params: { maxResults: 100 } }
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should include prefix and delimiter', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [], prefixes: [] } });

      await GoogleCloudStorageConnector.actions.listObjects.handler(mockContext, {
        bucket: 'my-bucket',
        prefix: 'reports/2024/',
        delimiter: '/',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b/my-bucket/o',
        expect.objectContaining({
          params: expect.objectContaining({
            prefix: 'reports/2024/',
            delimiter: '/',
          }),
        })
      );
    });

    it('should URL-encode bucket names with special characters', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [], prefixes: [] } });

      await GoogleCloudStorageConnector.actions.listObjects.handler(mockContext, {
        bucket: 'my bucket',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b/my%20bucket/o',
        expect.anything()
      );
    });

    it('should throw GCS API error', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { error: { message: 'Bucket not found', code: 404 } } },
      });

      await expect(
        GoogleCloudStorageConnector.actions.listObjects.handler(mockContext, { bucket: 'missing' })
      ).rejects.toThrow('Google Cloud Storage API error (404)');
    });
  });

  describe('getObjectMetadata action', () => {
    it('should return filtered object metadata', async () => {
      const rawMeta = {
        kind: 'storage#object',
        id: 'my-bucket/report.pdf/1234',
        selfLink: 'https://storage.googleapis.com/...',
        mediaLink: 'https://storage.googleapis.com/download/...',
        name: 'report.pdf',
        bucket: 'my-bucket',
        generation: '1234',
        metageneration: '1',
        contentType: 'application/pdf',
        storageClass: 'STANDARD',
        size: '4096',
        md5Hash: 'abc123',
        crc32c: 'xyz',
        etag: 'etag-value',
        timeCreated: '2024-01-01T00:00:00.000Z',
        updated: '2024-06-01T00:00:00.000Z',
        timeStorageClassUpdated: '2024-01-01T00:00:00.000Z',
        metadata: { department: 'finance' },
      };
      mockClient.get.mockResolvedValue({ data: rawMeta });

      const result = await GoogleCloudStorageConnector.actions.getObjectMetadata.handler(
        mockContext,
        { bucket: 'my-bucket', object: 'report.pdf' }
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b/my-bucket/o/report.pdf'
      );
      expect(result).toEqual(rawMeta);
    });

    it('should URL-encode object names with slashes and spaces', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await GoogleCloudStorageConnector.actions.getObjectMetadata.handler(mockContext, {
        bucket: 'my-bucket',
        object: 'reports/2024/jan report.pdf',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b/my-bucket/o/reports%2F2024%2Fjan%20report.pdf'
      );
    });

    it('should throw GCS API error', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { error: { message: 'Not found', code: 404 } } },
      });

      await expect(
        GoogleCloudStorageConnector.actions.getObjectMetadata.handler(mockContext, {
          bucket: 'my-bucket',
          object: 'missing.pdf',
        })
      ).rejects.toThrow('Google Cloud Storage API error (404)');
    });
  });

  describe('downloadObject action', () => {
    it('should download an object and return base64 content when under size limit', async () => {
      const metaResponse = {
        data: {
          name: 'report.pdf',
          bucket: 'my-bucket',
          contentType: 'application/pdf',
          size: '1024',
          timeCreated: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
        },
      };
      const contentResponse = { data: Buffer.from('pdf content') };

      mockClient.get.mockResolvedValueOnce(metaResponse).mockResolvedValueOnce(contentResponse);

      const result = await GoogleCloudStorageConnector.actions.downloadObject.handler(mockContext, {
        bucket: 'my-bucket',
        object: 'report.pdf',
        maximumDownloadSizeBytes: 768000,
      });

      expect(mockClient.get).toHaveBeenNthCalledWith(
        1,
        'https://storage.googleapis.com/storage/v1/b/my-bucket/o/report.pdf'
      );
      expect(mockClient.get).toHaveBeenNthCalledWith(
        2,
        'https://storage.googleapis.com/storage/v1/b/my-bucket/o/report.pdf',
        { params: { alt: 'media' }, responseType: 'arraybuffer' }
      );
      expect(result).toEqual({
        name: 'report.pdf',
        bucket: 'my-bucket',
        contentType: 'application/pdf',
        size: '1024',
        timeCreated: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
        hasContent: true,
        content: Buffer.from('pdf content').toString('base64'),
        encoding: 'base64',
      });
    });

    it('should skip download and return metadata when file exceeds size limit', async () => {
      const metaResponse = {
        data: {
          name: 'huge-video.mp4',
          bucket: 'my-bucket',
          contentType: 'video/mp4',
          size: '1000000',
          timeCreated: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
        },
      };

      mockClient.get.mockResolvedValueOnce(metaResponse);

      const result = await GoogleCloudStorageConnector.actions.downloadObject.handler(mockContext, {
        bucket: 'my-bucket',
        object: 'huge-video.mp4',
        maximumDownloadSizeBytes: 768000,
      });

      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        name: 'huge-video.mp4',
        bucket: 'my-bucket',
        contentType: 'video/mp4',
        size: '1000000',
        timeCreated: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
        hasContent: false,
        message:
          'File size (1000000 bytes) exceeds maximum download size (768000 bytes). Use get_object_metadata to inspect this file without downloading.',
      });
    });

    it('should throw GCS API error on download failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { error: { message: 'Forbidden', code: 403 } } },
      });

      await expect(
        GoogleCloudStorageConnector.actions.downloadObject.handler(mockContext, {
          bucket: 'my-bucket',
          object: 'private.pdf',
          maximumDownloadSizeBytes: 768000,
        })
      ).rejects.toThrow('Google Cloud Storage API error (403)');
    });
  });

  describe('test handler', () => {
    it('should return success on 200 response', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: { items: [] } });

      if (!GoogleCloudStorageConnector.test) throw new Error('Test handler not defined');
      const result = await GoogleCloudStorageConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Google Cloud Storage API',
      });
    });

    it('should return success on 400 response (missing project param proves token is valid)', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 400,
          data: { error: { code: 400, message: 'Required parameter: project' } },
        },
      });

      if (!GoogleCloudStorageConnector.test) throw new Error('Test handler not defined');
      const result = await GoogleCloudStorageConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Google Cloud Storage API',
      });
    });

    it('should return failure on auth error', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!GoogleCloudStorageConnector.test) throw new Error('Test handler not defined');
      const result = await GoogleCloudStorageConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: false,
        message: 'Failed to connect to Google Cloud Storage API: Invalid credentials',
      });
    });
  });
});
