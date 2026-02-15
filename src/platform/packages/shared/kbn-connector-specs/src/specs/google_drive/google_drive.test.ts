/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GoogleDriveConnector } from './google_drive';

describe('GoogleDriveConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchFiles action', () => {
    it('should search files with a query', async () => {
      const mockResponse = {
        data: {
          files: [
            {
              id: 'file-1',
              name: 'Report.pdf',
              mimeType: 'application/pdf',
              size: '1024',
              modifiedTime: '2025-01-01T00:00:00.000Z',
              webViewLink: 'https://drive.google.com/file/d/file-1/view',
            },
          ],
          nextPageToken: undefined,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GoogleDriveConnector.actions.searchFiles.handler(mockContext, {
        query: "fullText contains 'report'",
        pageSize: 250,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://www.googleapis.com/drive/v3/files', {
        params: {
          q: "fullText contains 'report'",
          pageSize: 250,
          fields:
            'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
        },
      });
      expect(result).toEqual({
        files: mockResponse.data.files,
        nextPageToken: undefined,
      });
    });

    it('should include pageToken when provided', async () => {
      const mockResponse = {
        data: {
          files: [],
          nextPageToken: undefined,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await GoogleDriveConnector.actions.searchFiles.handler(mockContext, {
        query: "name contains 'test'",
        pageSize: 10,
        pageToken: 'next-page-token',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://www.googleapis.com/drive/v3/files', {
        params: {
          q: "name contains 'test'",
          pageSize: 10,
          pageToken: 'next-page-token',
          fields:
            'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
        },
      });
    });

    it('should cap pageSize at 1000', async () => {
      const mockResponse = { data: { files: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await GoogleDriveConnector.actions.searchFiles.handler(mockContext, {
        query: 'test',
        pageSize: 5000,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          params: expect.objectContaining({ pageSize: 1000 }),
        })
      );
    });

    it('should include orderBy when provided', async () => {
      const mockResponse = { data: { files: [], nextPageToken: undefined } };
      mockClient.get.mockResolvedValue(mockResponse);

      await GoogleDriveConnector.actions.searchFiles.handler(mockContext, {
        query: "'me' in owners and trashed=false",
        pageSize: 1,
        orderBy: 'createdTime desc',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          params: expect.objectContaining({
            q: "'me' in owners and trashed=false",
            pageSize: 1,
            orderBy: 'createdTime desc',
          }),
        })
      );
    });

    it('should throw Google Drive API error when present', async () => {
      const error = {
        response: {
          data: {
            error: { message: 'Invalid query', code: 400 },
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GoogleDriveConnector.actions.searchFiles.handler(mockContext, {
          query: 'bad query',
          pageSize: 250,
        })
      ).rejects.toThrow('Google Drive API error (400)');
    });

    it('should rethrow non-Google errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      await expect(
        GoogleDriveConnector.actions.searchFiles.handler(mockContext, {
          query: 'test',
          pageSize: 250,
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('listFiles action', () => {
    it('should list files in root folder by default', async () => {
      const mockResponse = {
        data: {
          files: [
            {
              id: 'file-1',
              name: 'Document.docx',
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              size: '2048',
              modifiedTime: '2025-01-01T00:00:00.000Z',
              webViewLink: 'https://drive.google.com/file/d/file-1/view',
            },
          ],
          nextPageToken: undefined,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GoogleDriveConnector.actions.listFiles.handler(mockContext, {
        folderId: 'root',
        pageSize: 250,
        includeTrashed: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://www.googleapis.com/drive/v3/files', {
        params: {
          q: "'root' in parents and trashed=false",
          pageSize: 250,
          fields:
            'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
        },
      });
      expect(result).toEqual({
        files: mockResponse.data.files,
        nextPageToken: undefined,
      });
    });

    it('should list files in a specific folder', async () => {
      const mockResponse = { data: { files: [], nextPageToken: undefined } };
      mockClient.get.mockResolvedValue(mockResponse);

      await GoogleDriveConnector.actions.listFiles.handler(mockContext, {
        folderId: 'folder-abc123',
        pageSize: 250,
        includeTrashed: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          params: expect.objectContaining({
            q: "'folder-abc123' in parents and trashed=false",
          }),
        })
      );
    });

    it('should include trashed files when requested', async () => {
      const mockResponse = { data: { files: [], nextPageToken: undefined } };
      mockClient.get.mockResolvedValue(mockResponse);

      await GoogleDriveConnector.actions.listFiles.handler(mockContext, {
        folderId: 'root',
        pageSize: 250,
        includeTrashed: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          params: expect.objectContaining({
            q: "'root' in parents",
          }),
        })
      );
    });

    it('should include orderBy when provided', async () => {
      const mockResponse = { data: { files: [], nextPageToken: undefined } };
      mockClient.get.mockResolvedValue(mockResponse);

      await GoogleDriveConnector.actions.listFiles.handler(mockContext, {
        folderId: 'root',
        pageSize: 250,
        orderBy: 'modifiedTime',
        includeTrashed: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          params: expect.objectContaining({
            orderBy: 'modifiedTime',
          }),
        })
      );
    });

    it('should include pageToken when provided', async () => {
      const mockResponse = { data: { files: [], nextPageToken: undefined } };
      mockClient.get.mockResolvedValue(mockResponse);

      await GoogleDriveConnector.actions.listFiles.handler(mockContext, {
        folderId: 'root',
        pageSize: 250,
        pageToken: 'page-token-xyz',
        includeTrashed: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          params: expect.objectContaining({
            pageToken: 'page-token-xyz',
          }),
        })
      );
    });

    it('should escape special characters in folder IDs', async () => {
      const mockResponse = { data: { files: [], nextPageToken: undefined } };
      mockClient.get.mockResolvedValue(mockResponse);

      await GoogleDriveConnector.actions.listFiles.handler(mockContext, {
        folderId: "folder's\\id",
        pageSize: 250,
        includeTrashed: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          params: expect.objectContaining({
            q: "'folder\\'s\\\\id' in parents and trashed=false",
          }),
        })
      );
    });

    it('should throw Google Drive API error when present', async () => {
      const error = {
        response: {
          data: {
            error: { message: 'Folder not found', code: 404 },
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GoogleDriveConnector.actions.listFiles.handler(mockContext, {
          folderId: 'nonexistent',
          pageSize: 250,
          includeTrashed: false,
        })
      ).rejects.toThrow('Google Drive API error (404)');
    });
  });

  describe('downloadFile action', () => {
    it('should download a native file', async () => {
      const metadataResponse = {
        data: {
          id: 'file-1',
          name: 'report.pdf',
          mimeType: 'application/pdf',
          size: '1024',
        },
      };
      const contentResponse = {
        data: Buffer.from('pdf content'),
      };

      mockClient.get.mockResolvedValueOnce(metadataResponse).mockResolvedValueOnce(contentResponse);

      const result = await GoogleDriveConnector.actions.downloadFile.handler(mockContext, {
        fileId: 'file-1',
      });

      // First call: metadata
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-1',
        {
          params: { fields: 'id, name, mimeType, size' },
        }
      );

      // Second call: content download
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-1',
        {
          params: { alt: 'media' },
          responseType: 'arraybuffer',
        }
      );

      expect(result).toEqual({
        id: 'file-1',
        name: 'report.pdf',
        mimeType: 'application/pdf',
        size: '1024',
        content: Buffer.from('pdf content').toString('base64'),
        encoding: 'base64',
      });
    });

    it('should export a Google Doc as PDF', async () => {
      const metadataResponse = {
        data: {
          id: 'doc-1',
          name: 'My Document',
          mimeType: 'application/vnd.google-apps.document',
          size: undefined,
        },
      };
      const contentResponse = {
        data: Buffer.from('exported pdf'),
      };

      mockClient.get.mockResolvedValueOnce(metadataResponse).mockResolvedValueOnce(contentResponse);

      const result = await GoogleDriveConnector.actions.downloadFile.handler(mockContext, {
        fileId: 'doc-1',
      });

      // Second call: export
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/doc-1/export',
        {
          params: { mimeType: 'application/pdf' },
          responseType: 'arraybuffer',
        }
      );

      expect(result).toEqual({
        id: 'doc-1',
        name: 'My Document',
        mimeType: 'application/pdf',
        size: undefined,
        content: Buffer.from('exported pdf').toString('base64'),
        encoding: 'base64',
      });
    });

    it('should export a Google Spreadsheet as XLSX', async () => {
      const metadataResponse = {
        data: {
          id: 'sheet-1',
          name: 'My Spreadsheet',
          mimeType: 'application/vnd.google-apps.spreadsheet',
          size: undefined,
        },
      };
      const contentResponse = {
        data: Buffer.from('exported xlsx'),
      };

      mockClient.get.mockResolvedValueOnce(metadataResponse).mockResolvedValueOnce(contentResponse);

      const result = await GoogleDriveConnector.actions.downloadFile.handler(mockContext, {
        fileId: 'sheet-1',
      });

      // The export API call should use XLSX mime type for spreadsheets
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/sheet-1/export',
        {
          params: {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          responseType: 'arraybuffer',
        }
      );

      expect(result).toEqual(
        expect.objectContaining({
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
    });

    it('should throw Google Drive API error when present', async () => {
      const error = {
        response: {
          data: {
            error: { message: 'File not found', code: 404 },
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GoogleDriveConnector.actions.downloadFile.handler(mockContext, {
          fileId: 'nonexistent',
        })
      ).rejects.toThrow('Google Drive API error (404)');
    });
  });

  describe('getFileMetadata action', () => {
    const metadataFields =
      'id,name,mimeType,size,createdTime,modifiedTime,owners,lastModifyingUser,sharingUser,shared,starred,trashed,permissions,description,parents,labelInfo,webViewLink';

    it('should fetch metadata for a single file', async () => {
      const mockResponse = {
        data: {
          id: 'file-1',
          name: 'Report.pdf',
          mimeType: 'application/pdf',
          size: '1024',
          createdTime: '2025-01-01T00:00:00.000Z',
          modifiedTime: '2025-06-01T00:00:00.000Z',
          owners: [{ displayName: 'Alice', emailAddress: 'alice@example.com' }],
          lastModifyingUser: { displayName: 'Bob', emailAddress: 'bob@example.com' },
          shared: true,
          permissions: [
            { id: '1', role: 'owner', type: 'user', emailAddress: 'alice@example.com' },
          ],
          webViewLink: 'https://drive.google.com/file/d/file-1/view',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GoogleDriveConnector.actions.getFileMetadata.handler(mockContext, {
        fileIds: ['file-1'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-1',
        { params: { fields: metadataFields } }
      );
      expect(result).toEqual({ files: [mockResponse.data] });
    });

    it('should fetch metadata for multiple files in parallel', async () => {
      const mockResponse1 = {
        data: { id: 'file-1', name: 'Doc 1', mimeType: 'application/pdf' },
      };
      const mockResponse2 = {
        data: { id: 'file-2', name: 'Doc 2', mimeType: 'application/pdf' },
      };
      const mockResponse3 = {
        data: { id: 'file-3', name: 'Doc 3', mimeType: 'application/pdf' },
      };

      mockClient.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)
        .mockResolvedValueOnce(mockResponse3);

      const result = await GoogleDriveConnector.actions.getFileMetadata.handler(mockContext, {
        fileIds: ['file-1', 'file-2', 'file-3'],
      });

      expect(mockClient.get).toHaveBeenCalledTimes(3);
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-1',
        { params: { fields: metadataFields } }
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-2',
        { params: { fields: metadataFields } }
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-3',
        { params: { fields: metadataFields } }
      );
      expect(result).toEqual({
        files: [mockResponse1.data, mockResponse2.data, mockResponse3.data],
      });
    });

    it('should throw Google Drive API error when present', async () => {
      const error = {
        response: {
          data: {
            error: { message: 'File not found', code: 404 },
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GoogleDriveConnector.actions.getFileMetadata.handler(mockContext, {
          fileIds: ['nonexistent'],
        })
      ).rejects.toThrow('Google Drive API error (404)');
    });

    it('should fail if any file in the batch fails', async () => {
      const mockResponse = {
        data: { id: 'file-1', name: 'Doc 1' },
      };
      const error = {
        response: {
          data: {
            error: { message: 'Permission denied', code: 403 },
          },
        },
      };

      mockClient.get.mockResolvedValueOnce(mockResponse).mockRejectedValueOnce(error);

      await expect(
        GoogleDriveConnector.actions.getFileMetadata.handler(mockContext, {
          fileIds: ['file-1', 'file-2'],
        })
      ).rejects.toThrow('Google Drive API error (403)');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        status: 200,
        data: {
          user: {
            emailAddress: 'user@example.com',
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!GoogleDriveConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GoogleDriveConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://www.googleapis.com/drive/v3/about', {
        params: { fields: 'user' },
      });
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Google Drive API as user@example.com',
      });
    });

    it('should fall back to generic user label when email is missing', async () => {
      const mockResponse = {
        status: 200,
        data: {
          user: {},
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!GoogleDriveConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GoogleDriveConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Google Drive API as user',
      });
    });

    it('should return failure when API returns non-200 status', async () => {
      const mockResponse = {
        status: 401,
        data: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!GoogleDriveConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GoogleDriveConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: false,
        message: 'Failed to connect to Google Drive API',
      });
    });

    it('should return failure when API throws an error', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!GoogleDriveConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GoogleDriveConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: false,
        message: 'Failed to connect to Google Drive API: Invalid credentials',
      });
    });
  });
});
