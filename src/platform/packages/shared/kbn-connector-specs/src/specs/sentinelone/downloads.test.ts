/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { API, AUTH, CONSOLE, request, resetMocksAroundEachTest, run } from './test_helpers';

resetMocksAroundEachTest();

describe('downloads', () => {
  const fileResponse = (body: string, headers: Record<string, string> = {}) => ({
    status: 200,
    data: new TextEncoder().encode(body).buffer,
    headers: { 'content-type': 'application/zip', ...headers },
  });

  it('downloadAgentFile returns base64 content, name, type and size from the console', async () => {
    request.mockResolvedValueOnce(
      fileResponse('PK-archive', { 'content-disposition': 'attachment; filename="files.zip"' })
    );
    await expect(run('downloadAgentFile', { agentId: '11', activityId: '99' })).resolves.toEqual({
      content: Buffer.from('PK-archive').toString('base64'),
      fileName: 'files.zip',
      contentType: 'application/zip',
      sizeBytes: 10,
    });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        url: `${API}/agents/11/uploads/99`,
        headers: AUTH,
        responseType: 'arraybuffer',
        maxRedirects: 0,
        maxContentLength: 25 * 1024 * 1024,
      })
    );
  });

  it('downloadRemoteScriptResults fetches the link and sends no token to another host', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            data: {
              downloadLinks: [
                {
                  taskId: '61',
                  fileName: 'out.zip',
                  downloadUrl: 'https://files.example.net/out.zip?sig=1',
                },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce(fileResponse('results'));
    const result = await run('downloadRemoteScriptResults', { taskId: '61' });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: `${API}/remote-scripts/fetch-files`,
        data: { data: { taskIds: ['61'] } },
      })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: 'https://files.example.net/out.zip?sig=1',
        headers: { Authorization: false, token: false },
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        fileName: 'out.zip',
        taskId: '61',
        sizeBytes: 7,
      })
    );
    // the signed link is used to fetch the file but is not handed back (workflow history would keep it)
    expect(result).not.toHaveProperty('downloadUrl');
  });

  it('downloadRemoteScriptResults fails with the V1 message when there is no link', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { data: { downloadLinks: [] } } } });
    await expect(run('downloadRemoteScriptResults', { taskId: '61' })).rejects.toThrow(
      'Download URL for script results of task id [61] not found'
    );
  });

  it('downloadThreatFile sends the token to a console link but strips it on a cross-host redirect', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { downloadUrl: `${CONSOLE}/web/api/v2.1/threats/31/file` } },
      })
      .mockResolvedValueOnce({
        status: 302,
        data: new ArrayBuffer(0),
        headers: { location: 'https://cdn.example.net/blob' },
      })
      .mockResolvedValueOnce(fileResponse('threat'));
    const result = await run('downloadThreatFile', { threatId: '31' });
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: `${CONSOLE}/web/api/v2.1/threats/31/file`,
        headers: AUTH,
        maxRedirects: 0,
      })
    );
    expect(request.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        url: 'https://cdn.example.net/blob',
        headers: { Authorization: false, token: false },
      })
    );
    expect(result).toEqual(expect.objectContaining({ threatId: '31', sizeBytes: 6 }));
    expect(result).not.toHaveProperty('downloadUrl');
  });

  it('downloadThreatFile fails clearly when SentinelOne returns no link', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: {} } });
    await expect(run('downloadThreatFile', { threatId: '31' })).rejects.toThrow(
      'No file download link for threat [31]'
    );
  });

  it('fails instead of truncating a file over 25 MB', async () => {
    request.mockRejectedValueOnce(
      Object.assign(new Error('maxContentLength size of 26214400 exceeded'), {
        isAxiosError: true,
        code: 'ERR_BAD_RESPONSE',
      })
    );
    await expect(run('downloadAgentFile', { agentId: '11', activityId: '99' })).rejects.toThrow(
      'File larger than 25 MB; download it from the SentinelOne console'
    );
  });
});
