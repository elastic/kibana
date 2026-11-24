/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TrendVisionOne } from './trend_vision_one';
import {
  AGENT_GUID,
  ctx,
  httpError,
  ok,
  request,
  resetMocksAroundEachTest,
  run,
  vendorError,
} from './test_helpers';

resetMocksAroundEachTest();

const accepted = (taskId: string) =>
  ok(
    [
      {
        status: 202,
        headers: [{ name: 'Operation-Location', value: `https://x/v3.0/response/tasks/${taskId}` }],
      },
    ],
    {},
    207
  );
const itemError = (status: number, code: string, message: string) =>
  ok([{ status, body: { error: { code, message } } }], {}, 207);

const TASK_INPUTS: Array<[string, Record<string, unknown>]> = [
  ['isolateEndpoint', { agentGuid: AGENT_GUID }],
  ['restoreEndpointConnection', { agentGuid: AGENT_GUID }],
  ['terminateProcess', { agentGuid: AGENT_GUID, processId: 4, fileName: 'C:\\a.exe' }],
  ['collectForensicFile', { agentGuid: AGENT_GUID, filePath: 'C:\\a.txt' }],
  ['quarantineEmailMessage', { uniqueId: 'AAMk-1' }],
  ['deleteEmailMessage', { uniqueId: 'AAMk-1' }],
  ['disableUserAccount', { accountName: 'lab.user' }],
  ['enableUserAccount', { accountName: 'lab.user' }],
  ['forceUserSignOut', { accountName: 'lab.user' }],
];

const LIST_INPUTS: Array<[string, Record<string, unknown>]> = [
  ['addToSuspiciousObjectList', { type: 'domain', value: 'soar-test.example' }],
  ['removeFromSuspiciousObjectList', { type: 'domain', value: 'soar-test.example' }],
  ['addToExceptionList', { type: 'domain', value: 'soar-test.example' }],
];

describe('TrendAI Vision One per-item errors', () => {
  it.each(TASK_INPUTS)(
    '%s reports the failed item with the product code and message',
    async (name, input) => {
      request.mockResolvedValueOnce(itemError(400, 'NotSupported', 'Unsupported agent version'));
      await expect(run(name, input)).rejects.toThrow(
        `${name} failed for the target (400): NotSupported: Unsupported agent version`
      );
    }
  );

  it.each(LIST_INPUTS)(
    '%s reports the failed item with the product code and message',
    async (name, input) => {
      request.mockResolvedValueOnce(itemError(400, 'BadRequest', 'Invalid domain'));
      await expect(run(name, input)).rejects.toThrow(
        `${name} failed for the target (400): BadRequest: Invalid domain`
      );
    }
  );

  it('submitUrlsToSandbox returns the failed item next to the accepted one', async () => {
    const answer = [
      { status: 202, body: { id: 'u-1', url: 'https://example.com' } },
      { status: 400, body: { error: { code: 'BadRequest', message: 'URL format is not right' } } },
    ];
    request.mockResolvedValueOnce(ok(answer, {}, 207));
    const result = (await run('submitUrlsToSandbox', { urls: ['https://example.com', 'bad'] })) as {
      items: unknown[];
    };
    expect(result.items).toEqual(answer);
  });

  it('updateAlertStatus fails with the upstream error text when the alert lookup fails and sends no change', async () => {
    request.mockRejectedValue(
      httpError(500, vendorError('InternalServerError', 'Workbench unavailable'))
    );
    await expect(run('updateAlertStatus', { id: 'WB-1', status: 'Closed' })).rejects.toThrow(
      'updateAlertStatus failed (500): InternalServerError: Workbench unavailable'
    );
    expect(request.mock.calls.every(([config]) => config.method === 'GET')).toBe(true);
  });
});

describe('TrendAI Vision One repeated calls', () => {
  it.each(TASK_INPUTS)(
    '%s called twice while the task runs returns skipped the second time',
    async (name, input) => {
      request
        .mockResolvedValueOnce(accepted('00000031'))
        .mockResolvedValueOnce(itemError(400, 'TaskError', 'Task duplication.'));
      await expect(run(name, input)).resolves.toMatchObject({
        outcome: 'requested',
        taskId: '00000031',
      });
      await expect(run(name, input)).resolves.toMatchObject({ outcome: 'skipped', taskId: null });
    }
  );

  it('addToSuspiciousObjectList called twice reports added both times (the product updates the entry)', async () => {
    request.mockResolvedValue(ok([{ status: 201 }], {}, 207));
    await expect(run(...LIST_INPUTS[0])).resolves.toMatchObject({ outcome: 'added' });
    await expect(run(...LIST_INPUTS[0])).resolves.toMatchObject({ outcome: 'added' });
  });

  it('removeFromSuspiciousObjectList called twice reports removed, then notFound', async () => {
    request
      .mockResolvedValueOnce(ok([{ status: 204 }], {}, 207))
      .mockResolvedValueOnce(itemError(404, 'NotFound', 'Object not found'));
    await expect(run(...LIST_INPUTS[1])).resolves.toMatchObject({ outcome: 'removed' });
    await expect(run(...LIST_INPUTS[1])).resolves.toMatchObject({ outcome: 'notFound' });
  });

  it('addToExceptionList called twice reports added both times', async () => {
    request.mockResolvedValue(ok([{ status: 201 }], {}, 207));
    await expect(run(...LIST_INPUTS[2])).resolves.toMatchObject({ outcome: 'added' });
    await expect(run(...LIST_INPUTS[2])).resolves.toMatchObject({ outcome: 'added' });
  });

  it('addAlertNote called twice adds two notes', async () => {
    request
      .mockResolvedValueOnce(
        ok(undefined, { location: 'https://x/v3.0/workbench/alerts/WB-1/notes/1' }, 201)
      )
      .mockResolvedValueOnce(
        ok(undefined, { location: 'https://x/v3.0/workbench/alerts/WB-1/notes/2' }, 201)
      );
    await expect(run('addAlertNote', { alertId: 'WB-1', content: 'n' })).resolves.toMatchObject({
      noteId: '1',
    });
    await expect(run('addAlertNote', { alertId: 'WB-1', content: 'n' })).resolves.toMatchObject({
      noteId: '2',
    });
  });

  it('updateAlertStatus called twice updates, then skips', async () => {
    request
      .mockResolvedValueOnce(ok({ id: 'WB-1', status: 'Open' }, { etag: '"e1"' }))
      .mockResolvedValueOnce(ok(undefined, {}, 204))
      .mockResolvedValueOnce(ok({ id: 'WB-1', status: 'Closed' }, { etag: '"e2"' }));
    await expect(run('updateAlertStatus', { id: 'WB-1', status: 'Closed' })).resolves.toMatchObject(
      { outcome: 'updated' }
    );
    await expect(run('updateAlertStatus', { id: 'WB-1', status: 'Closed' })).resolves.toMatchObject(
      { outcome: 'skipped' }
    );
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('submitFileToSandbox called twice creates two submissions', async () => {
    request
      .mockResolvedValueOnce(ok({ id: 's-1' }, {}, 202))
      .mockResolvedValueOnce(ok({ id: 's-2' }, {}, 202));
    await expect(
      run('submitFileToSandbox', { file: 'aGVsbG8=', fileName: 'a.txt' })
    ).resolves.toMatchObject({ id: 's-1' });
    await expect(
      run('submitFileToSandbox', { file: 'aGVsbG8=', fileName: 'a.txt' })
    ).resolves.toMatchObject({ id: 's-2' });
  });

  it('submitUrlsToSandbox called twice creates two submissions', async () => {
    request
      .mockResolvedValueOnce(ok([{ status: 202, body: { id: 'u-1' } }], {}, 207))
      .mockResolvedValueOnce(ok([{ status: 202, body: { id: 'u-2' } }], {}, 207));
    await expect(
      run('submitUrlsToSandbox', { urls: ['https://example.com'] })
    ).resolves.toMatchObject({ items: [{ body: { id: 'u-1' } }] });
    await expect(
      run('submitUrlsToSandbox', { urls: ['https://example.com'] })
    ).resolves.toMatchObject({ items: [{ body: { id: 'u-2' } }] });
  });
});

describe('TrendAI Vision One read requests retry a server error', () => {
  const page = ok({ totalCount: 0, count: 0, items: [] });
  it.each([
    ['listAlerts', {}, page],
    ['getAlertDetails', { id: 'WB-1' }, ok({ id: 'WB-1', status: 'Open' }, { etag: '"e1"' })],
    ['listObservedAttackTechniques', {}, page],
    ['listEndpoints', {}, page],
    ['getResponseTaskStatus', { id: '00000012' }, ok({ id: '00000012', status: 'running' })],
  ])('%s is read again after a 503 and succeeds', async (name, input, answer) => {
    request.mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(answer);
    await expect(run(name, input)).resolves.toBeDefined();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('updateAlertStatus retries the read of the alert but never the PATCH', async () => {
    request
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce(ok({ id: 'WB-1', status: 'Open' }, { etag: '"e1"' }))
      .mockRejectedValueOnce(httpError(503));
    await expect(run('updateAlertStatus', { id: 'WB-1', status: 'Closed' })).rejects.toThrow(
      '(503)'
    );
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.map(([config]) => config.method)).toEqual(['GET', 'GET', 'PATCH']);
  });

  it('the connector test retries its connectivity check after a 503', async () => {
    request
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce(ok({ status: 'available' }));
    await expect(TrendVisionOne.test?.handler(ctx)).resolves.toEqual({
      message: 'Connected to TrendAI Vision One (available)',
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('a response task start is not repeated after a 503', async () => {
    request.mockRejectedValueOnce(httpError(503));
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).rejects.toThrow('(503)');
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('TrendAI Vision One read retry statuses', () => {
  it.each([500, 502, 503, 504, 429])('a read is retried after HTTP %s', async (status) => {
    request
      .mockRejectedValueOnce(httpError(status))
      .mockResolvedValueOnce(ok({ id: '00000012', status: 'running' }));
    await expect(run('getResponseTaskStatus', { id: '00000012' })).resolves.toMatchObject({
      status: 'running',
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403, 404, 501])('a read is not retried after HTTP %s', async (status) => {
    request.mockRejectedValueOnce(httpError(status));
    await expect(run('getResponseTaskStatus', { id: '00000012' })).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('TrendAI Vision One per-item status range', () => {
  const item = (status: number) =>
    ok([{ status, body: { error: { code: 'X', message: 'item' } } }], {}, 207);

  it('treats an item status of 299 as accepted', async () => {
    request.mockResolvedValueOnce(item(299));
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).resolves.toMatchObject({
      outcome: 'requested',
      status: 299,
    });
  });

  it('fails on an item status of 300', async () => {
    request.mockResolvedValueOnce(item(300));
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).rejects.toThrow(
      'isolateEndpoint failed for the target (300): X: item'
    );
  });
});
