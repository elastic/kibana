/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { AzureBlob } from './azure_blob';

describe('AzureBlob', () => {
  const mockClient = {
    get: jest.fn(),
    head: jest.fn(),
  };

  const baseUrl = 'https://myaccount.blob.core.windows.net';
  const mockContext = {
    client: mockClient,
    config: { accountUrl: baseUrl },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(AzureBlob).toBeDefined();
    expect(AzureBlob.metadata.id).toBe('.azure-blob');
    expect(AzureBlob.metadata.displayName).toBe('Azure Blob Storage');
    expect(AzureBlob.auth?.types).toEqual(['azure_shared_key']);
  });

  describe('listContainers action', () => {
    it('should list containers and parse XML response', async () => {
      const xml =
        '<?xml version="1.0"?><EnumerationResults><Containers><Container><Name>container1</Name></Container><Container><Name>container2</Name></Container></Containers><NextMarker></NextMarker></EnumerationResults>';
      mockClient.get.mockResolvedValue({ data: xml });

      const result = await AzureBlob.actions.listContainers.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/`,
        expect.objectContaining({
          params: { comp: 'list' },
          responseType: 'text',
        })
      );
      expect(result).toEqual({ containers: [{ name: 'container1' }, { name: 'container2' }] });
    });

    it('should pass prefix, maxresults, and marker', async () => {
      mockClient.get.mockResolvedValue({
        data: '<EnumerationResults><Containers></Containers><NextMarker>next</NextMarker></EnumerationResults>',
      });

      await AzureBlob.actions.listContainers.handler(mockContext, {
        prefix: 'my-',
        maxresults: 5,
        marker: 'marker1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/`,
        expect.objectContaining({
          params: { comp: 'list', prefix: 'my-', maxresults: 5, marker: 'marker1' },
        })
      );
    });
  });

  describe('listBlobs action', () => {
    it('should list blobs and parse XML response', async () => {
      const xml =
        '<?xml version="1.0"?><EnumerationResults><Blobs><Blob><Name>file1.txt</Name><Content-Length>100</Content-Length><Last-Modified>Mon, 01 Jan 2024 00:00:00 GMT</Last-Modified></Blob></Blobs><NextMarker></NextMarker></EnumerationResults>';
      mockClient.get.mockResolvedValue({ data: xml });

      const result = await AzureBlob.actions.listBlobs.handler(mockContext, {
        container: 'mycontainer',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/mycontainer`,
        expect.objectContaining({
          params: { restype: 'container', comp: 'list' },
          responseType: 'text',
        })
      );
      expect(result.blobs).toHaveLength(1);
      expect(result.blobs[0].name).toBe('file1.txt');
      expect(result.blobs[0].contentLength).toBe(100);
    });
  });

  describe('getBlob action', () => {
    it('should get blob and return base64 content', async () => {
      const buffer = Buffer.from('hello');
      mockClient.get.mockResolvedValue({
        data: buffer,
        headers: { 'content-type': 'text/plain', 'content-length': '5' },
      });

      const result = await AzureBlob.actions.getBlob.handler(mockContext, {
        container: 'mycontainer',
        blobName: 'file.txt',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/mycontainer/file.txt`,
        expect.objectContaining({ responseType: 'arraybuffer' })
      );
      expect(result.contentBase64).toBe(Buffer.from('hello').toString('base64'));
      expect(result.contentType).toBe('text/plain');
      expect(result.contentLength).toBe(5);
    });
  });

  describe('getBlobProperties action', () => {
    it('should return blob properties from HEAD response', async () => {
      mockClient.head.mockResolvedValue({
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': '1024',
          'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
          etag: '"0x8ABC123"',
        },
      });

      const result = await AzureBlob.actions.getBlobProperties.handler(mockContext, {
        container: 'mycontainer',
        blobName: 'file.txt',
      });

      expect(mockClient.head).toHaveBeenCalledWith(`${baseUrl}/mycontainer/file.txt`);
      expect(result.contentType).toBe('application/octet-stream');
      expect(result.contentLength).toBe(1024);
      expect(result.lastModified).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
      expect(result.etag).toBe('"0x8ABC123"');
    });
  });

  describe('test handler', () => {
    const runTestHandler = async (ctx: ActionContext) => {
      const testDef = AzureBlob.test;
      if (!testDef) throw new Error('AzureBlob.test is undefined');
      return testDef.handler(ctx);
    };

    it('should succeed when list containers returns', async () => {
      mockClient.get.mockResolvedValue({
        data: '<EnumerationResults><Containers></Containers></EnumerationResults>',
      });

      const result = await runTestHandler(mockContext);

      expect(result.ok).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/`,
        expect.objectContaining({ params: { comp: 'list', maxresults: 1 } })
      );
    });

    it('should fail when accountUrl is missing', async () => {
      const ctxNoConfig = { ...mockContext, config: {} } as unknown as ActionContext;
      const result = await runTestHandler(ctxNoConfig);
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Storage account URL');
    });

    it('should return ok: false on API error', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));
      const result = await runTestHandler(mockContext);
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Unauthorized');
    });
  });
});
