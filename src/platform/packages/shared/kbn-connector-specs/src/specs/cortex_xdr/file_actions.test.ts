/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { timing } from './client';
import { fileActions, toDownloadRoute } from './file_actions';

const API_URL = 'https://api-tenant.xdr.us.paloaltonetworks.com';
const BASE = `${API_URL}/public_api/v1`;
const SHA = 'a'.repeat(64);

const ok = (data: unknown, headers: Record<string, string> = {}) => ({
  status: 200,
  data,
  headers,
});
const httpError = (status: number, data: unknown = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers: {} },
  });

const createContext = () => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { apiUrl: API_URL },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const run = (ctx: ActionContext, name: keyof typeof fileActions, input: unknown) => {
  const action = fileActions[name];
  return action.handler(ctx, action.input.parse(input) as never);
};

describe('Cortex XDR file actions', () => {
  beforeEach(() => jest.spyOn(timing, 'sleep').mockResolvedValue());
  afterEach(() => jest.restoreAllMocks());

  describe('toDownloadRoute', () => {
    const { ctx } = createContext();
    it.each([
      [`${BASE}/download/abc123`, '/download/abc123'],
      ['/public_api/v1/download/abc123', '/download/abc123'],
      [`${BASE}/download/a%2Fb`, '/download/a%2Fb'],
    ])('accepts %s', (link, expected) => {
      expect(toDownloadRoute(ctx, link)).toBe(expected);
    });

    it.each([
      ['an off-origin host', 'https://evil.example/public_api/v1/download/abc'],
      ['a protocol-relative host', '//evil.example/public_api/v1/download/abc'],
      ['another scheme', 'http://api-tenant.xdr.us.paloaltonetworks.com/public_api/v1/download/x'],
      ['another port', `${API_URL}:8443/public_api/v1/download/x`],
      ['another route', `${BASE}/endpoints/isolate`],
      ['a nested path', `${BASE}/download/a/b`],
      ['a traversal', `${BASE}/download/../endpoints/isolate`],
      ['a query string', `${BASE}/download/abc?x=1`],
      ['an empty value', ''],
      ['a non-string', 42],
    ])('rejects %s', (_label, link) => {
      expect(toDownloadRoute(ctx, link)).toBeUndefined();
    });
  });

  describe('getRetrievedFileDetails', () => {
    it('returns the download route per endpoint without downloading by default', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { data: { ep1: `${BASE}/download/zip1` } } }));
      const result = await run(ctx, 'getRetrievedFileDetails', { actionId: 77 });
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0].data).toEqual({ request_data: { group_action_id: '77' } });
      expect(result).toMatchObject({
        ready: true,
        files: [{ endpointId: 'ep1', downloadRoute: '/download/zip1', downloaded: false }],
      });
    });

    it('reports ready false while there is no link yet', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { data: {} } }));
      await expect(run(ctx, 'getRetrievedFileDetails', { actionId: '5' })).resolves.toMatchObject({
        ready: false,
        files: [],
      });
    });

    it('downloads a same-origin archive from its own URL and returns it as base64', async () => {
      const { ctx, request } = createContext();
      const zip = Uint8Array.from([0x50, 0x4b, 3, 4]).buffer;
      request
        .mockResolvedValueOnce(ok({ reply: { data: { ep1: `${BASE}/download/zip1` } } }))
        .mockResolvedValueOnce(ok(zip));
      const result = await run(ctx, 'getRetrievedFileDetails', { actionId: 1, download: true });
      expect(request.mock.calls[1][0]).toMatchObject({
        method: 'POST',
        url: `${BASE}/download/zip1`,
        responseType: 'arraybuffer',
        maxContentLength: 768_000,
        maxRedirects: 0,
      });
      expect(result).toMatchObject({
        files: [{ endpointId: 'ep1', downloaded: true, sizeBytes: 4, contentBase64: 'UEsDBA==' }],
      });
    });

    it.each([
      ['absolute', 'https://evil.example/public_api/v1/download/zip1'],
      ['protocol-relative', '//evil.example/public_api/v1/download/zip1'],
    ])('never sends an authenticated request to an %s off-origin link', async (_label, link) => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { data: { ep1: link } } }));
      const result = await run(ctx, 'getRetrievedFileDetails', { actionId: 1, download: true });
      expect(request).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        ready: false,
        files: [
          {
            endpointId: 'ep1',
            downloadRoute: null,
            downloaded: false,
            skippedReason: 'the download link is not a download route on the configured API host',
          },
        ],
      });
    });

    it('skips an archive over maxDownloadSizeBytes without failing the action', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce(ok({ reply: { data: { ep1: `${BASE}/download/big` } } }))
        .mockRejectedValueOnce(
          Object.assign(new Error('maxContentLength size of 10 exceeded'), { isAxiosError: true })
        );
      const result = await run(ctx, 'getRetrievedFileDetails', {
        actionId: 1,
        download: true,
        maxDownloadSizeBytes: 10,
      });
      expect(request.mock.calls[1][0].maxContentLength).toBe(10);
      expect(result).toMatchObject({
        files: [{ downloaded: false, skippedReason: 'larger than maxDownloadSizeBytes' }],
      });
    });

    it('rejects a maxDownloadSizeBytes above the inline limit', () => {
      expect(
        fileActions.getRetrievedFileDetails.input.safeParse({
          actionId: 1,
          maxDownloadSizeBytes: 768_001,
        }).success
      ).toBe(false);
    });
  });

  it('quarantines with the documented body: endpoint filter, path and SHA256', async () => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(
      ok({ reply: { action_id: '9', status: 'ok', endpoints_count: '2' } })
    );
    const result = await run(ctx, 'quarantineFile', {
      endpointIds: ['ep1', 'ep2'],
      filePath: 'C:\\temp\\evil.exe',
      fileHash: SHA,
    });
    expect(request.mock.calls[0][0]).toMatchObject({
      url: `${BASE}/endpoints/quarantine`,
      data: {
        request_data: {
          filters: [{ field: 'endpoint_id_list', operator: 'in', value: ['ep1', 'ep2'] }],
          file_path: 'C:\\temp\\evil.exe',
          file_hash: SHA,
        },
      },
    });
    expect(result).toEqual({ reply: { action_id: '9', status: 'ok', endpoints_count: '2' } });
  });

  it('restores on all endpoints when endpointId is omitted, with an integer case id', async () => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(ok({ reply: { action_id: '3' } }));
    await run(ctx, 'restoreFile', { fileHash: SHA, caseId: 12 });
    expect(request.mock.calls[0][0].data).toEqual({
      request_data: { file_hash: SHA, incident_id: 12 },
    });
  });

  it.each([
    [{ endpointId: 'ep1', fileHash: SHA }, true],
    [{ files: [{ endpointId: 'ep1', fileHash: SHA }] }, true],
    [{ endpointId: 'ep1' }, false],
    [{ endpointId: 'ep1', fileHash: SHA, files: [{ endpointId: 'ep1', fileHash: SHA }] }, false],
    [{}, false],
  ])('getQuarantineStatus accepts exactly one form: %j -> %s', (input, valid) => {
    expect(fileActions.getQuarantineStatus.input.safeParse(input).success).toBe(valid);
  });

  it('sends the single-file quarantine status form as files[0]', async () => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(ok({ reply: [{ endpoint_id: 'ep1', status: true }] }));
    await run(ctx, 'getQuarantineStatus', { endpointId: 'ep1', fileHash: SHA, filePath: '/tmp/x' });
    expect(request.mock.calls[0][0].data).toEqual({
      request_data: { files: [{ endpoint_id: 'ep1', file_hash: SHA, file_path: '/tmp/x' }] },
    });
  });

  describe('hash lists', () => {
    it('adds to the block list and returns the confirmed count', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok(true));
      await expect(
        run(ctx, 'blocklistFiles', { hashList: [SHA, 'b'.repeat(64)], comment: 'IR-42', caseId: 7 })
      ).resolves.toEqual({ success: true, hashCount: 2 });
      expect(request.mock.calls[0][0]).toMatchObject({
        url: `${BASE}/hash_exceptions/blocklist`,
        data: {
          request_data: { hash_list: [SHA, 'b'.repeat(64)], comment: 'IR-42', incident_id: 7 },
        },
      });
    });

    it('fails when the vendor does not confirm the change', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { err_code: 500, err_msg: 'not saved' } }));
      await expect(run(ctx, 'allowlistFiles', { hashList: [SHA] })).rejects.toThrow(
        'Cortex XDR did not confirm the change: not saved'
      );
    });

    it('does not retry a 500 on a state-changing hash list call', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(500));
      await expect(run(ctx, 'blocklistFiles', { hashList: [SHA] })).rejects.toThrow('HTTP 500');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([['g'.repeat(64)], ['a'.repeat(63)], ['a'.repeat(65)]])(
      'rejects %s as a hash',
      (hash) => {
        expect(fileActions.blocklistFiles.input.safeParse({ hashList: [hash] }).success).toBe(
          false
        );
      }
    );

    it('rejects more than 1000 hashes and comments over 1024 characters', () => {
      expect(
        fileActions.blocklistFiles.input.safeParse({ hashList: Array(1001).fill(SHA) }).success
      ).toBe(false);
      expect(
        fileActions.blocklistFiles.input.safeParse({ hashList: [SHA], comment: 'x'.repeat(1025) })
          .success
      ).toBe(false);
    });
  });

  describe('retrieveFile', () => {
    it('groups paths by operating system and leaves out empty lists', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { action_id: '11' } }));
      await run(ctx, 'retrieveFile', {
        endpointIds: ['ep1'],
        windowsPaths: ['C:\\a.txt'],
        linuxPaths: [],
        caseId: '42',
      });
      expect(request.mock.calls[0][0].data).toEqual({
        request_data: {
          filters: [{ field: 'endpoint_id_list', operator: 'in', value: ['ep1'] }],
          files: { windows: ['C:\\a.txt'] },
          incident_id: '42',
        },
      });
    });

    it.each([
      ['no path', { endpointIds: ['ep1'] }],
      [
        '21 paths',
        {
          endpointIds: ['ep1'],
          windowsPaths: Array(11).fill('a'),
          linuxPaths: Array(10).fill('b'),
        },
      ],
      ['11 endpoints', { endpointIds: Array(11).fill('ep'), linuxPaths: ['/a'] }],
      ['a non-numeric case id', { endpointIds: ['ep1'], linuxPaths: ['/a'], caseId: '12a' }],
    ])('rejects %s', (_label, input) => {
      expect(fileActions.retrieveFile.input.safeParse(input).success).toBe(false);
    });

    it('accepts exactly 20 paths across the lists', () => {
      expect(
        fileActions.retrieveFile.input.safeParse({
          endpointIds: ['ep1'],
          windowsPaths: Array(10).fill('a'),
          macosPaths: Array(10).fill('b'),
        }).success
      ).toBe(true);
    });
  });
  it('getRetrievedFileDetails keeps the other archives when one download answers 404', async () => {
    const { ctx, request } = createContext();
    request
      .mockResolvedValueOnce(
        ok({
          reply: {
            data: {
              e1: `${BASE}/download/a1`,
              e2: `${BASE}/download/a2`,
            },
          },
        })
      )
      .mockRejectedValueOnce(httpError(404))
      .mockResolvedValueOnce(ok(new Uint8Array([1, 2, 3]).buffer));
    const result = (await run(ctx, 'getRetrievedFileDetails', {
      actionId: '16',
      download: true,
    })) as { files: Array<Record<string, unknown>> };
    expect(result.files[0]).toMatchObject({
      endpointId: 'e1',
      downloaded: false,
      skippedReason: expect.stringContaining('could not be downloaded'),
    });
    expect(result.files[1]).toMatchObject({ endpointId: 'e2', downloaded: true, sizeBytes: 3 });
  });
});
