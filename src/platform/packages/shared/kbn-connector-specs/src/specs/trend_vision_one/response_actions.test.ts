/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { taskIdFrom } from './multi_status';
import {
  AGENT_GUID,
  API,
  httpError,
  ok,
  parseInput,
  request,
  resetMocksAroundEachTest,
  run,
  sent,
  vendorError,
} from './test_helpers';

resetMocksAroundEachTest();

const accepted = (taskId = '00000012') =>
  ok(
    [
      {
        status: 202,
        headers: [
          {
            name: 'Operation-Location',
            value: `https://api.xdr.trendmicro.com/v3.0/xdr/response/tasks/${taskId}`,
          },
        ],
      },
    ],
    {},
    207
  );
const itemError = (status: number, code: string, message: string) =>
  ok([{ status, body: { error: { code, message } } }], {}, 207);

/** Action, input, path, the one item it must send. */
const TASK_CASES: Array<[string, Record<string, unknown>, string, Record<string, unknown>]> = [
  [
    'isolateEndpoint',
    { agentGuid: AGENT_GUID, description: 'IR-1' },
    '/response/endpoints/isolate',
    { agentGuid: AGENT_GUID, description: 'IR-1' },
  ],
  [
    'restoreEndpointConnection',
    { endpointName: 'lab-win-01' },
    '/response/endpoints/restore',
    { endpointName: 'lab-win-01' },
  ],
  [
    'terminateProcess',
    {
      agentGuid: AGENT_GUID,
      processId: 4242,
      fileName: 'C:\\Windows\\notepad.exe',
      fileSha1: 'a'.repeat(40),
    },
    '/response/endpoints/terminateProcess',
    {
      agentGuid: AGENT_GUID,
      processId: 4242,
      fileName: 'C:\\Windows\\notepad.exe',
      fileSha1: 'a'.repeat(40),
    },
  ],
  [
    'terminateProcess',
    { endpointName: 'lab-win-01', processId: 7, fileName: 'C:\\Windows\\notepad.exe' },
    '/response/endpoints/terminateProcess',
    { endpointName: 'lab-win-01', processId: 7, fileName: 'C:\\Windows\\notepad.exe' },
  ],
  [
    'terminateProcess',
    { agentGuid: AGENT_GUID, processId: 8, fileSha1: 'b'.repeat(40) },
    '/response/endpoints/terminateProcess',
    { agentGuid: AGENT_GUID, processId: 8, fileSha1: 'b'.repeat(40) },
  ],
  [
    'collectForensicFile',
    { agentGuid: AGENT_GUID, filePath: 'C:\\temp\\a.txt' },
    '/response/endpoints/collectFile',
    { agentGuid: AGENT_GUID, filePath: 'C:\\temp\\a.txt' },
  ],
  [
    'quarantineEmailMessage',
    { messageId: '<m1@example.com>', mailBox: 'lab@example.com' },
    '/response/emails/quarantine',
    { messageId: '<m1@example.com>', mailBox: 'lab@example.com' },
  ],
  ['deleteEmailMessage', { uniqueId: 'AAMk-1' }, '/response/emails/delete', { uniqueId: 'AAMk-1' }],
  [
    'disableUserAccount',
    { accountName: 'lab.user' },
    '/response/domainAccounts/disable',
    { accountName: 'lab.user' },
  ],
  [
    'enableUserAccount',
    { accountName: 'lab.user' },
    '/response/domainAccounts/enable',
    { accountName: 'lab.user' },
  ],
  [
    'forceUserSignOut',
    { accountName: 'lab.user@example.com' },
    '/response/domainAccounts/signOut',
    { accountName: 'lab.user@example.com' },
  ],
];

describe('TrendAI Vision One response tasks', () => {
  it.each(TASK_CASES)(
    '%s sends one item to its route and returns the task id',
    async (name, input, path, item) => {
      request.mockResolvedValueOnce(accepted());
      await expect(run(name, input)).resolves.toEqual({
        outcome: 'requested',
        status: 202,
        taskId: '00000012',
        error: null,
      });
      expect(request).toHaveBeenCalledTimes(1);
      expect(sent()).toMatchObject({ method: 'POST', url: `${API}${path}` });
      expect(sent().data).toEqual([item]);
    }
  );

  it('returns skipped when the same task is already in progress', async () => {
    request.mockResolvedValueOnce(itemError(400, 'TaskError', 'Task duplication.'));
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).resolves.toEqual({
      outcome: 'skipped',
      status: 400,
      taskId: null,
      error: { code: 'TaskError', message: 'Task duplication.' },
    });
  });

  it('returns the task id of the running task when a duplicate item carries Operation-Location', async () => {
    request.mockResolvedValueOnce(
      ok(
        [
          {
            status: 400,
            headers: [
              {
                name: 'Operation-Location',
                value: 'https://api.xdr.trendmicro.com/v3.0/response/tasks/00000031',
              },
            ],
            body: { error: { code: 'TaskError', message: 'Task duplication.' } },
          },
        ],
        {},
        207
      )
    );
    await expect(run('restoreEndpointConnection', { agentGuid: AGENT_GUID })).resolves.toEqual({
      outcome: 'skipped',
      status: 400,
      taskId: '00000031',
      error: { code: 'TaskError', message: 'Task duplication.' },
    });
  });

  it.each([
    [400, 'BadRequest', 'Target not found.'],
    [404, 'NotFound', 'Endpoint does not exist'],
  ])('fails for an unknown target (item %s %s)', async (status, code, message) => {
    request.mockResolvedValueOnce(itemError(status, code, message));
    await expect(run('restoreEndpointConnection', { endpointName: 'gone' })).rejects.toThrow(
      `restoreEndpointConnection found no such target (${status}): ${code}: ${message}`
    );
  });

  it('names both causes when restore by endpointName gets an item 500: an unknown name or a server error', async () => {
    request.mockResolvedValueOnce(itemError(500, 'InternalServerError', 'Internal server error.'));
    const error = await run('restoreEndpointConnection', { endpointName: 'gone' }).catch(
      (caught: Error) => caught
    );
    expect((error as Error).message).toBe(
      'TrendAI Vision One restoreEndpointConnection failed for the target (500): InternalServerError: Internal server error. TrendAI Vision One answers 500 both for an endpointName it does not know and for a server error: check the name with listEndpoints or use agentGuid; if the name is right, retry later'
    );
    expect((error as Error).message).not.toContain('found no such target');
  });

  it('joins the hint with one period when the item message has no final period', async () => {
    request.mockResolvedValueOnce(itemError(500, 'InternalServerError', 'boom'));
    const error = await run('restoreEndpointConnection', { endpointName: 'gone' }).catch(
      (caught: Error) => caught
    );
    expect((error as Error).message).toContain('InternalServerError: boom. TrendAI Vision One');
    expect((error as Error).message).not.toContain('..');
  });

  it('keeps an item 500 of restore by agentGuid as a failed target', async () => {
    request.mockResolvedValueOnce(itemError(500, 'InternalServerError', 'boom'));
    await expect(run('restoreEndpointConnection', { agentGuid: AGENT_GUID })).rejects.toThrow(
      'restoreEndpointConnection failed for the target (500): InternalServerError: boom'
    );
  });

  it('repeating an isolate that is still running succeeds as skipped, not as a new task', async () => {
    request
      .mockResolvedValueOnce(accepted('00000020'))
      .mockResolvedValueOnce(itemError(400, 'TaskError', 'Task duplication.'));
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).resolves.toMatchObject({
      outcome: 'requested',
      taskId: '00000020',
    });
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).resolves.toMatchObject({
      outcome: 'skipped',
      taskId: null,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    [400, 'NotSupported', 'Unsupported platform'],
    [403, 'AccessDenied', 'Feature disabled'],
    [500, 'InternalServerError', 'boom'],
  ])('fails on item %s %s with the product message', async (status, code, message) => {
    request.mockResolvedValueOnce(itemError(status, code, message));
    await expect(
      run('terminateProcess', { agentGuid: AGENT_GUID, processId: 1, fileName: 'C:\\a.exe' })
    ).rejects.toThrow(`terminateProcess failed for the target (${status}): ${code}: ${message}`);
  });

  it('fails when the product answers without a per-item status', async () => {
    request.mockResolvedValueOnce(ok({}, {}, 207));
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).rejects.toThrow(
      'returned no per-item status'
    );
  });

  it('does not repeat a response task after a server error', async () => {
    request.mockRejectedValueOnce(httpError(503));
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).rejects.toThrow('(503)');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reports a missing permission as a 403 with the permission hint', async () => {
    request.mockRejectedValueOnce(
      httpError(403, vendorError('AccessDenied', 'Insufficient permissions'))
    );
    await expect(run('disableUserAccount', { accountName: 'x' })).rejects.toThrow(
      "Grant the API key's role"
    );
  });

  it.each([
    ['isolateEndpoint', {}],
    ['isolateEndpoint', { agentGuid: AGENT_GUID, endpointName: 'both' }],
    ['isolateEndpoint', { agentGuid: 'not-a-guid' }],
    ['terminateProcess', { agentGuid: AGENT_GUID }],
    ['terminateProcess', { agentGuid: AGENT_GUID, processId: 1 }],
    ['terminateProcess', { agentGuid: AGENT_GUID, processId: 1, fileName: '' }],
    ['terminateProcess', { agentGuid: AGENT_GUID, processId: 1, fileSha1: 'xyz' }],
    ['collectForensicFile', { agentGuid: AGENT_GUID }],
    ['collectForensicFile', { agentGuid: AGENT_GUID, filePath: 'C:\\'.padEnd(1025, 'a') }],
    ['quarantineEmailMessage', { messageId: 'm', uniqueId: 'u' }],
    ['quarantineEmailMessage', { uniqueId: 'u', mailBox: 'a@b.c' }],
    ['deleteEmailMessage', {}],
    ['disableUserAccount', { accountName: '' }],
    ['isolateEndpoint', { endpointName: 'a'.repeat(256) }],
    ['isolateEndpoint', { agentGuid: AGENT_GUID, description: 'd'.repeat(20481) }],
  ])('%s rejects %j at the schema', (name, input) => {
    expect(parseInput(name, input).success).toBe(false);
  });

  it.each([
    ['https://api.xdr.trendmicro.com/v3.0/xdr/response/tasks/00000001', '00000001'],
    ['https://api.in.xdr.trendmicro.com/v3.0/response/tasks/00000002', '00000002'],
    ['/v3.0/response/tasks/00000003?x=1', '00000003'],
  ])('takes the task id from the last segment of %s', (value, id) => {
    expect(taskIdFrom({ headers: [{ name: 'Operation-Location', value }] })).toBe(id);
  });

  it.each([
    ['https://api.xdr.trendmicro.com/v3.0/response/tasks/%E0%A4%A', null],
    ['/v3.0/response/tasks/%', null],
    ['/v3.0/response/tasks/RM%2D1', 'RM-1'],
  ])('reads the task id from %s without throwing on a malformed sequence', (value, id) => {
    expect(taskIdFrom({ headers: [{ name: 'Operation-Location', value }] })).toBe(id);
  });

  it('keeps a started task a success when its Operation-Location is malformed', async () => {
    request.mockResolvedValueOnce(accepted('%E0%A4%A'));
    await expect(run('isolateEndpoint', { agentGuid: AGENT_GUID })).resolves.toEqual({
      outcome: 'requested',
      status: 202,
      taskId: null,
      error: null,
    });
  });

  it.each([[''], ['   '], ['\t']])('refuses the blank mailBox %j before any request', (mailBox) => {
    const parsed = parseInput('quarantineEmailMessage', { messageId: '<m@x>', mailBox });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error)).toContain('mailBox must not be blank');
  });

  it('sends a padded mailBox trimmed and none when it is absent', async () => {
    request.mockResolvedValue(accepted());
    await run('quarantineEmailMessage', { messageId: '<m@x>', mailBox: '  lab@example.com ' });
    expect(sent().data).toEqual([{ messageId: '<m@x>', mailBox: 'lab@example.com' }]);
    await run('quarantineEmailMessage', { messageId: '<m@x>' });
    expect(sent(1).data).toEqual([{ messageId: '<m@x>' }]);
  });

  it('returns a null taskId without an Operation-Location header', () => {
    expect(taskIdFrom({ headers: [] })).toBeNull();
  });

  it('accepts a 1024-character filePath', () => {
    expect(
      parseInput('collectForensicFile', {
        agentGuid: AGENT_GUID,
        filePath: 'C:\\'.padEnd(1024, 'a'),
      }).success
    ).toBe(true);
  });

  it('accepts a 20480-character description', () => {
    expect(
      parseInput('isolateEndpoint', { agentGuid: AGENT_GUID, description: 'd'.repeat(20480) })
        .success
    ).toBe(true);
  });
});

describe('TrendAI Vision One getResponseTaskStatus', () => {
  it('returns the task without the signed archive link and its password', async () => {
    request.mockResolvedValueOnce(
      ok({
        id: '00000012',
        status: 'succeeded',
        action: 'collectFile',
        resourceLocation: 'https://blob.example/archive.zip?sig=secret',
        password: 'archive-pass',
        fileSha256: 'f'.repeat(64),
        expiredDateTime: '2026-11-27T00:00:00Z',
      })
    );
    const result = await run('getResponseTaskStatus', { id: '00000012' });
    expect(sent().url).toBe(`${API}/response/tasks/00000012`);
    expect(result).toEqual({
      id: '00000012',
      status: 'succeeded',
      action: 'collectFile',
      fileSha256: 'f'.repeat(64),
      expiredDateTime: '2026-11-27T00:00:00Z',
      archiveReady: true,
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('removes the signed links and passwords of a multi-target task from every tasks[] item', async () => {
    request.mockResolvedValueOnce(
      ok({
        id: '00000020',
        status: 'succeeded',
        action: 'runCustomScriptForMultiple',
        tasks: [
          {
            agentGuid: AGENT_GUID,
            status: 'succeeded',
            fileName: 'collect.ps1',
            resourceLocation: 'https://blob.example/result-1.zip?sig=nested-secret-1',
            password: 'nested-pass-1',
            expiredDateTime: '2026-11-27T00:00:00Z',
          },
          {
            agentGuid: AGENT_GUID,
            status: 'failed',
            fileName: 'collect.ps1',
            resourceLocation: '',
            password: 'nested-pass-2',
          },
          { agentGuid: AGENT_GUID, status: 'running', fileName: 'collect.ps1' },
        ],
      })
    );
    const result = await run('getResponseTaskStatus', { id: '00000020' });
    expect(result).toEqual({
      id: '00000020',
      status: 'succeeded',
      action: 'runCustomScriptForMultiple',
      tasks: [
        {
          agentGuid: AGENT_GUID,
          status: 'succeeded',
          fileName: 'collect.ps1',
          expiredDateTime: '2026-11-27T00:00:00Z',
          archiveReady: true,
        },
        { agentGuid: AGENT_GUID, status: 'failed', fileName: 'collect.ps1', archiveReady: false },
        { agentGuid: AGENT_GUID, status: 'running', fileName: 'collect.ps1' },
      ],
    });
    const output = JSON.stringify(result);
    for (const leaked of ['resourceLocation', 'password', 'nested-secret', 'nested-pass']) {
      expect(output).not.toContain(leaked);
    }
  });

  it('returns other tasks unchanged', async () => {
    request.mockResolvedValueOnce(
      ok({ id: '13', status: 'running', action: 'isolate', agentGuid: AGENT_GUID })
    );
    await expect(run('getResponseTaskStatus', { id: '13' })).resolves.toEqual({
      id: '13',
      status: 'running',
      action: 'isolate',
      agentGuid: AGENT_GUID,
    });
  });

  it('fails with a not found message for an unknown task', async () => {
    request.mockRejectedValueOnce(httpError(404, vendorError('NotFound', 'Task not found')));
    await expect(run('getResponseTaskStatus', { id: '99' })).rejects.toThrow(
      'Response task 99 not found'
    );
  });
});

describe('TrendAI Vision One identifier inputs are trimmed', () => {
  it.each([
    ['isolateEndpoint', { endpointName: '   ' }, 'endpointName must not be blank'],
    ['restoreEndpointConnection', { endpointName: ' \t ' }, 'endpointName must not be blank'],
    [
      'terminateProcess',
      { agentGuid: AGENT_GUID, processId: 1, fileName: '  ' },
      'fileName must not be blank',
    ],
    [
      'collectForensicFile',
      { agentGuid: AGENT_GUID, filePath: '  ' },
      'filePath must not be blank',
    ],
    ['quarantineEmailMessage', { messageId: '  ' }, 'messageId must not be blank'],
    ['deleteEmailMessage', { uniqueId: '  ' }, 'uniqueId must not be blank'],
    ['disableUserAccount', { accountName: '  ' }, 'accountName must not be blank'],
    ['addToSuspiciousObjectList', { type: 'domain', value: '  ' }, 'value must not be blank'],
    ['getResponseTaskStatus', { id: '  ' }, 'id must not be blank'],
    ['getAlertDetails', { id: '  ' }, 'id must not be blank'],
  ])('%s refuses %j with a clear message', (name, input, message) => {
    const result = parseInput(name, input);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  it('sends a padded endpointName trimmed and keeps the spaces inside it', async () => {
    request.mockResolvedValueOnce(accepted());
    await run('isolateEndpoint', { endpointName: '  lab win 01  ' });
    expect(sent().data).toEqual([{ endpointName: 'lab win 01' }]);
  });

  it.each([
    ['restoreEndpointConnection', { agentGuid: ` ${AGENT_GUID} ` }, { agentGuid: AGENT_GUID }],
    ['enableUserAccount', { accountName: ' lab.user ' }, { accountName: 'lab.user' }],
    ['quarantineEmailMessage', { uniqueId: ' AAMk 1 ' }, { uniqueId: 'AAMk 1' }],
  ])('%s sends %j trimmed', async (name, input, item) => {
    request.mockResolvedValueOnce(accepted());
    await run(name, input);
    expect(sent().data).toEqual([item]);
  });

  it('getAlertDetails reads a padded id trimmed', async () => {
    request.mockResolvedValueOnce(ok({ id: 'WB-1' }, { etag: '"e1"' }));
    await run('getAlertDetails', { id: ' WB-1 ' });
    expect(sent().url).toBe(`${API}/workbench/alerts/WB-1`);
  });

  it('addToSuspiciousObjectList sends a padded value trimmed', async () => {
    request.mockResolvedValueOnce(ok([{ status: 201 }], {}, 207));
    await run('addToSuspiciousObjectList', {
      type: 'domain',
      value: ' test-elastic-soar.invalid ',
    });
    expect(sent().data).toEqual([{ domain: 'test-elastic-soar.invalid' }]);
  });
});

describe('TrendAI Vision One email actions reject unknown fields', () => {
  it.each(['quarantineEmailMessage', 'deleteEmailMessage'])(
    '%s rejects a misspelled mailBox instead of widening the request to all mailboxes',
    (name) => {
      const typo = parseInput(name, {
        messageId: '<a@example.test>',
        mailbox: 'user@example.test',
      });
      expect(typo.success).toBe(false);
      expect(JSON.stringify(typo.error)).toContain('mailbox');
      expect(
        parseInput(name, { messageId: '<a@example.test>', mailBox: 'user@example.test' }).success
      ).toBe(true);
      expect(parseInput(name, { uniqueId: 'abc' }).success).toBe(true);
    }
  );
});
