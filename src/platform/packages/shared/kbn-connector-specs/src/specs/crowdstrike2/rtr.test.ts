/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import { loggerMock } from '@kbn/logging-mocks';
import type { ActionContext } from '../../connector_spec';
import { timing } from './client';
import { retrieveFile, runBatchCommand, runSingleHostCommand } from './rtr';

const AID = '0123456789abcdef0123456789abcdef';
const AID2 = 'f'.repeat(32);
const SHA = 'a'.repeat(64);
const BASE = 'https://api.crowdstrike.com/real-time-response';

interface Reply {
  status?: number;
  data?: unknown;
}

const makeCtx = (replies: Reply[]) => {
  const request = jest.fn();
  for (const reply of replies) {
    request.mockResolvedValueOnce({ status: 200, headers: {}, data: {}, ...reply });
  }
  const ctx = {
    client: { request } as unknown as AxiosInstance,
    config: { region: 'us-1' },
    secrets: {},
    log: loggerMock.create(),
    getClient: jest.fn(),
  } as unknown as ActionContext;
  const calls = () =>
    request.mock.calls.map(([c]) => ({
      method: c.method,
      url: c.url,
      params: c.params,
      data: c.data,
      timeout: c.timeout,
    }));
  return { ctx, request, calls };
};

const initReply = (
  hosts: Record<string, unknown> = { [AID]: { session_id: 's1', errors: [] } }
) => ({
  status: 201,
  data: { batch_id: 'batch-1', resources: hosts, errors: [] },
});

describe('CrowdStrike Falcon Real Time Response', () => {
  let now: number;
  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(timing, 'now').mockImplementation(() => now);
    jest.spyOn(timing, 'sleep').mockImplementation(async (ms: number) => {
      now += ms;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  describe('runBatchCommand', () => {
    it('[C-edge-rtr-session-reuse-across-host-sets] opens one batch session for the de-duplicated hosts, then runs the command', async () => {
      const { ctx, calls } = makeCtx([
        initReply(),
        {
          status: 201,
          data: {
            combined: {
              resources: {
                [AID]: {
                  session_id: 's1',
                  task_id: 't1',
                  complete: true,
                  stdout: 'bin\n',
                  stderr: '',
                  base_command: 'ls',
                  errors: [],
                },
              },
            },
            errors: [],
          },
        },
      ]);
      const result = await runBatchCommand(ctx, 'read_only', {
        endpoint_ids: [AID, AID],
        command: 'ls /',
        timeout: 45,
        queue_offline: true,
      });
      expect(calls()).toEqual([
        {
          method: 'POST',
          url: `${BASE}/combined/batch-init-session/v1`,
          params: { timeout: 45 },
          data: { host_ids: [AID], queue_offline: true },
          timeout: 75_000,
        },
        {
          method: 'POST',
          url: `${BASE}/combined/batch-command/v1`,
          params: { timeout: 45 },
          data: { batch_id: 'batch-1', base_command: 'ls', command_string: 'ls /' },
          timeout: 75_000,
        },
        {
          method: 'DELETE',
          url: `${BASE}/entities/sessions/v1`,
          params: { session_id: 's1' },
          data: undefined,
          timeout: 30_000,
        },
      ]);
      expect(result).toMatchObject({
        batch_id: 'batch-1',
        complete: true,
        results: [{ host_id: AID, complete: true, stdout: 'bin\n', errors: [] }],
      });
    });

    it.each([
      ['active_responder', 'batch-active-responder-command', 'kill 42'],
      ['admin', 'batch-admin-command', 'put tool.exe'],
    ] as const)('sends the %s tier to its own route', async (tier, route, command) => {
      const { ctx, calls } = makeCtx([
        initReply(),
        { status: 201, data: { combined: { resources: {} } } },
      ]);
      await runBatchCommand(ctx, tier, { endpoint_ids: [AID], command });
      expect(calls()[1]).toMatchObject({
        url: `${BASE}/combined/${route}/v1`,
        params: { timeout: 30 },
      });
    });

    it('[C-edge-rtr-command-not-allowed-for-the-tier] rejects a command outside the tier before opening a session', async () => {
      const { ctx, request } = makeCtx([]);
      await expect(
        runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'rm -rf /' })
      ).rejects.toThrow("'rm' is not allowed in the read-only Real Time Response tier");
      expect(request).not.toHaveBeenCalled();
    });

    it('[C-edge-rtr-batch-init-without-batch-id] stops when the session has no batch_id, sending nothing else', async () => {
      const { ctx, request } = makeCtx([
        {
          status: 201,
          data: {
            batch_id: '',
            resources: {},
            errors: [{ code: 40407, message: 'Sensor appears to be offline' }],
          },
        },
      ]);
      await expect(
        runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' })
      ).rejects.toThrow(
        'Real Time Response session could not be opened: Sensor appears to be offline'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('[C-edge-partial-batch-failure] returns the init errors without sending the command when no host opened a session', async () => {
      const offline = { code: 40407, message: 'Sensor appears to be offline' };
      const { ctx, request } = makeCtx([
        initReply({
          [AID]: { session_id: '', errors: [offline] },
          [AID2]: { session_id: '', errors: [offline] },
        }),
      ]);
      const result = await runBatchCommand(ctx, 'read_only', {
        endpoint_ids: [AID, AID2],
        command: 'ls',
      });
      expect(request).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ batch_id: 'batch-1', complete: false, errors: [] });
      expect(result.results).toEqual([
        expect.objectContaining({ host_id: AID, complete: false, errors: [offline] }),
        expect.objectContaining({ host_id: AID2, complete: false, errors: [offline] }),
      ]);
    });

    it('[C-edge-rtr-host-offline] [C-edge-partial-batch-failure] [C-edge-rtr-command-still-running-at-timeout] returns running hosts with cloud_request_id and offline hosts with their errors', async () => {
      const { ctx, calls } = makeCtx([
        initReply({
          [AID]: { session_id: 's1', errors: [] },
          [AID2]: { session_id: '', errors: [{ code: 40407, message: 'offline' }] },
        }),
        {
          status: 201,
          data: {
            combined: {
              resources: {
                [AID]: { session_id: 's1', task_id: 'cr-1', complete: false, errors: [] },
              },
            },
          },
        },
      ]);
      const result = await runBatchCommand(ctx, 'read_only', {
        endpoint_ids: [AID, AID2],
        command: 'netstat',
      });
      expect(calls().filter((c) => c.method === 'DELETE')).toEqual([]);
      expect(result.complete).toBe(false);
      expect(result.results).toEqual([
        expect.objectContaining({ host_id: AID, complete: false, cloud_request_id: 'cr-1' }),
        expect.objectContaining({
          host_id: AID2,
          complete: false,
          errors: [{ code: 40407, message: 'offline' }],
        }),
      ]);
    });

    it('[C-http-policy] does not retry a state-changing batch command on 5xx', async () => {
      const { ctx, request } = makeCtx([
        initReply(),
        { status: 500, data: { errors: [{ code: 500, message: 'internal' }] } },
      ]);
      await expect(
        runBatchCommand(ctx, 'active_responder', { endpoint_ids: [AID], command: 'rm C:\\x' })
      ).rejects.toThrow('Status code: 500. Message: internal');
      expect(request).toHaveBeenCalledTimes(3);
      expect(request.mock.calls[2][0]).toMatchObject({
        method: 'DELETE',
        url: `${BASE}/entities/sessions/v1`,
        params: { session_id: 's1' },
      });
    });

    it('[C-edge-rtr-batch-session-end] deletes each finished host session and keeps running and offline-queued ones', async () => {
      const AID3 = 'c'.repeat(32);
      const AID4 = 'd'.repeat(32);
      const { ctx, calls } = makeCtx([
        initReply({
          [AID]: { session_id: 's1', errors: [] },
          [AID2]: { session_id: 's2', errors: [] },
          [AID3]: { session_id: 's3', offline_queued: true, errors: [] },
          [AID4]: { session_id: 's4', errors: [] },
        }),
        {
          status: 201,
          data: {
            combined: {
              resources: {
                [AID]: { session_id: 's1', task_id: 't1', complete: true, errors: [] },
                [AID2]: { session_id: 's2', task_id: 't2', complete: false, errors: [] },
                [AID3]: { session_id: 's3', complete: false, offline_queued: true, errors: [] },
                [AID4]: {
                  session_id: 's4',
                  complete: false,
                  errors: [{ code: 40006, message: 'Command not found' }],
                },
              },
            },
          },
        },
        { status: 204, data: null },
        { status: 204, data: null },
      ]);
      const result = await runBatchCommand(ctx, 'read_only', {
        endpoint_ids: [AID, AID2, AID3, AID4],
        command: 'ls',
        queue_offline: true,
      });
      expect(calls().slice(2)).toEqual([
        {
          method: 'DELETE',
          url: `${BASE}/entities/sessions/v1`,
          params: { session_id: 's1' },
          data: undefined,
          timeout: 30_000,
        },
        {
          method: 'DELETE',
          url: `${BASE}/entities/sessions/v1`,
          params: { session_id: 's4' },
          data: undefined,
          timeout: 30_000,
        },
      ]);
      expect(result.results).toEqual([
        expect.objectContaining({ host_id: AID, session_id: 's1', complete: true }),
        expect.objectContaining({ host_id: AID2, complete: false, cloud_request_id: 't2' }),
        expect.objectContaining({ host_id: AID3, complete: false, offline_queued: true }),
        expect.objectContaining({ host_id: AID4, complete: false }),
      ]);
    });

    it('[C-edge-rtr-batch-session-end] only logs a failed session delete and still returns the result', async () => {
      const { ctx } = makeCtx([
        initReply(),
        {
          status: 201,
          data: {
            combined: {
              resources: { [AID]: { session_id: 's1', complete: true, stdout: 'ok', errors: [] } },
            },
          },
        },
        { status: 400, data: { errors: [{ code: 400, message: 'session not deletable' }] } },
      ]);
      const result = await runBatchCommand(ctx, 'read_only', {
        endpoint_ids: [AID],
        command: 'ls',
      });
      expect(result).toMatchObject({ complete: true, results: [{ host_id: AID, stdout: 'ok' }] });
      expect(ctx.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not delete Real Time Response session')
      );
    });
  });

  describe('runSingleHostCommand', () => {
    const opened = { status: 201, data: { resources: [{ session_id: 'sess-1' }] } };
    const accepted = {
      status: 201,
      data: { resources: [{ session_id: 'sess-1', cloud_request_id: 'cr-1' }] },
    };

    it('[C-edge-rtr-batch-session-end] runs, polls until complete and deletes the session', async () => {
      const { ctx, calls } = makeCtx([
        opened,
        accepted,
        { data: { resources: [{ complete: false }] } },
        {
          data: {
            resources: [
              { complete: true, stdout: '', stderr: '', base_command: 'kill', sequence_id: 0 },
            ],
          },
        },
        { status: 204, data: null },
      ]);
      const result = await runSingleHostCommand(ctx, 'active_responder', {
        deviceId: AID,
        baseCommand: 'kill',
        commandString: 'kill 42',
        timeout: 30,
      });
      expect(result).toMatchObject({
        complete: true,
        cloud_request_id: 'cr-1',
        session_id: 'sess-1',
      });
      expect(calls()).toEqual([
        {
          method: 'POST',
          url: `${BASE}/entities/sessions/v1`,
          params: { timeout: 30 },
          data: { device_id: AID, queue_offline: false },
          timeout: 60_000,
        },
        {
          method: 'POST',
          url: `${BASE}/entities/active-responder-command/v1`,
          params: undefined,
          data: {
            session_id: 'sess-1',
            device_id: AID,
            base_command: 'kill',
            command_string: 'kill 42',
            persist: false,
          },
          timeout: 60_000,
        },
        {
          method: 'GET',
          url: `${BASE}/entities/active-responder-command/v1`,
          params: { cloud_request_id: 'cr-1', sequence_id: 0 },
          data: undefined,
          timeout: 60_000,
        },
        {
          method: 'GET',
          url: `${BASE}/entities/active-responder-command/v1`,
          params: { cloud_request_id: 'cr-1', sequence_id: 0 },
          data: undefined,
          timeout: 60_000,
        },
        {
          method: 'DELETE',
          url: `${BASE}/entities/sessions/v1`,
          params: { session_id: 'sess-1' },
          data: undefined,
          timeout: 60_000,
        },
      ]);
    });

    it('[C-edge-rtr-command-still-running-at-timeout] returns complete=false with cloud_request_id and keeps the session for the status poll', async () => {
      const running = { data: { resources: [{ complete: false }] } };
      const { ctx, request } = makeCtx([opened, accepted, ...Array(8).fill(running)]);
      const result = await runSingleHostCommand(ctx, 'read_only', {
        deviceId: AID,
        baseCommand: 'ps',
        commandString: 'ps',
        timeout: 10,
      });
      expect(result).toMatchObject({
        complete: false,
        cloud_request_id: 'cr-1',
        session_id: 'sess-1',
      });
      const methods = request.mock.calls.map(([c]) => c.method);
      expect(methods).not.toContain('DELETE');
      expect(methods.at(-1)).toBe('GET');
    });

    it('[C-edge-rtr-batch-session-end] deletes the session when the command fails', async () => {
      const { ctx, request } = makeCtx([
        opened,
        { status: 403, data: { errors: [{ code: 403, message: 'access denied' }] } },
        { status: 204 },
      ]);
      await expect(
        runSingleHostCommand(ctx, 'active_responder', {
          deviceId: AID,
          baseCommand: 'kill',
          commandString: 'kill 1',
          timeout: 30,
        })
      ).rejects.toThrow('the API client needs the Real time response: Write scope');
      expect(request.mock.calls[2][0]).toMatchObject({
        method: 'DELETE',
        params: { session_id: 'sess-1' },
      });
    });

    it('keeps the command error when the session delete also fails', async () => {
      const { ctx } = makeCtx([
        opened,
        { status: 400, data: { errors: [{ code: 400, message: 'bad pid' }] } },
        { status: 400, data: { errors: [{ code: 400, message: 'delete failed' }] } },
      ]);
      await expect(
        runSingleHostCommand(ctx, 'active_responder', {
          deviceId: AID,
          baseCommand: 'kill',
          commandString: 'kill 1',
          timeout: 30,
        })
      ).rejects.toThrow('Status code: 400. Message: bad pid');
      expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining('delete failed'));
    });
  });

  describe('retrieveFile', () => {
    const getSent = {
      status: 201,
      data: {
        batch_get_cmd_req_id: 'bgc-1',
        combined: { resources: { [AID]: { session_id: 's1', complete: false, errors: [] } } },
      },
    };
    const ready = (size: number) => ({
      data: { resources: { [AID]: { session_id: 's1', sha256: SHA, name: 'C:\\a\\b.txt', size } } },
    });

    it('returns the archive as base64 with its name, sha256 and size', async () => {
      const archive = Uint8Array.from(Buffer.from('7z-bytes'));
      const { ctx, calls } = makeCtx([
        initReply(),
        getSent,
        { data: { resources: {} } },
        ready(12),
        { data: archive.buffer },
      ]);
      const result = await retrieveFile(ctx, { device_id: AID, file_path: 'C:\\a\\b.txt' });
      expect(result).toEqual({
        complete: true,
        session_id: 's1',
        batch_get_cmd_req_id: 'bgc-1',
        file_name: 'b.txt',
        sha256: SHA,
        size: 12,
        content_base64: Buffer.from('7z-bytes').toString('base64'),
        archive_format: '7z',
      });
      expect(calls()[1]).toMatchObject({
        url: `${BASE}/combined/batch-get-command/v1`,
        data: { batch_id: 'batch-1', file_path: 'C:\\a\\b.txt' },
        params: { timeout: 60 },
      });
      expect(calls()[4]).toMatchObject({
        url: `${BASE}/entities/extracted-file-contents/v1`,
        params: { session_id: 's1', sha256: SHA, filename: 'b.txt' },
      });
      expect(calls()[5]).toEqual({
        method: 'DELETE',
        url: `${BASE}/entities/sessions/v1`,
        params: { session_id: 's1' },
        data: undefined,
        timeout: 30_000,
      });
      expect(calls()).toHaveLength(6);
    });

    it('refreshes the session before the download once it is older than 5 minutes', async () => {
      const archive = Uint8Array.from(Buffer.from('7z'));
      const { ctx, request, calls } = makeCtx([initReply()]);
      request
        .mockImplementationOnce(async () => {
          now += 6 * 60_000;
          return { headers: {}, ...getSent };
        })
        .mockResolvedValueOnce({ status: 200, headers: {}, ...ready(2) })
        .mockResolvedValueOnce({ status: 200, headers: {}, data: { batch_id: 'batch-1' } })
        .mockResolvedValueOnce({ status: 200, headers: {}, data: archive.buffer })
        .mockResolvedValueOnce({ status: 204, headers: {}, data: null });
      await expect(
        retrieveFile(ctx, { device_id: AID, file_path: 'C:\\a\\b.txt', timeout: 300 })
      ).resolves.toMatchObject({ complete: true, size: 2 });
      expect(calls().map((c) => `${c.method} ${c.url.replace(BASE, '')}`)).toEqual([
        'POST /combined/batch-init-session/v1',
        'POST /combined/batch-get-command/v1',
        'GET /combined/batch-get-command/v1',
        'POST /combined/batch-refresh-session/v1',
        'GET /entities/extracted-file-contents/v1',
        'DELETE /entities/sessions/v1',
      ]);
      expect(calls()[3].data).toEqual({ batch_id: 'batch-1' });
    });

    it('[C-edge-retrieved-file-over-1-mib] fails with the sha256 for a file over 1 MiB, without downloading it', async () => {
      const { ctx, request } = makeCtx([initReply(), getSent, ready(1_048_577)]);
      await expect(retrieveFile(ctx, { device_id: AID, file_path: 'C:\\big.iso' })).rejects.toThrow(
        `The file is 1048577 bytes, larger than the 1 MiB the connector returns (sha256 ${SHA})`
      );
      expect(request).toHaveBeenCalledTimes(4);
      expect(request.mock.calls[3][0]).toMatchObject({
        method: 'DELETE',
        url: `${BASE}/entities/sessions/v1`,
        params: { session_id: 's1' },
      });
    });

    it('returns complete=false when the file is not ready within the timeout', async () => {
      const notReady = { data: { resources: {} } };
      const { ctx, calls } = makeCtx([initReply(), getSent, ...Array(10).fill(notReady)]);
      await expect(
        retrieveFile(ctx, { device_id: AID, file_path: 'C:\\x', timeout: 5 })
      ).resolves.toEqual({ complete: false, session_id: 's1', batch_get_cmd_req_id: 'bgc-1' });
      expect(calls().filter((c) => c.method === 'DELETE')).toEqual([]);
    });

    it('reports a host error from the get command', async () => {
      const { ctx, calls } = makeCtx([
        initReply(),
        {
          status: 201,
          data: {
            batch_get_cmd_req_id: 'bgc-1',
            combined: {
              resources: { [AID]: { errors: [{ code: 40006, message: 'file not found' }] } },
            },
          },
        },
      ]);
      await expect(retrieveFile(ctx, { device_id: AID, file_path: 'C:\\nope' })).rejects.toThrow(
        'Real Time Response get failed on the host: file not found'
      );
      expect(calls()[2]).toMatchObject({ method: 'DELETE', params: { session_id: 's1' } });
      expect(calls()).toHaveLength(3);
    });

    it('resumes a timed-out retrieval by its batch_get_cmd_req_id without starting a new one', async () => {
      const archive = Uint8Array.from(Buffer.from('7z-bytes'));
      const { ctx, calls } = makeCtx([
        ready(12),
        { data: archive.buffer },
        { status: 204, data: null },
      ]);
      const result = await retrieveFile(ctx, {
        device_id: AID,
        file_path: 'C:\\a\\b.txt',
        batch_get_cmd_req_id: 'bgc-1',
        session_id: 's1',
      });
      expect(result).toMatchObject({
        complete: true,
        session_id: 's1',
        batch_get_cmd_req_id: 'bgc-1',
        sha256: SHA,
        content_base64: Buffer.from('7z-bytes').toString('base64'),
      });
      expect(calls().map((c) => `${c.method} ${c.url.replace(BASE, '')}`)).toEqual([
        'GET /combined/batch-get-command/v1',
        'GET /entities/extracted-file-contents/v1',
        'DELETE /entities/sessions/v1',
      ]);
      expect(calls()[0].params).toEqual({ batch_get_cmd_req_id: 'bgc-1', timeout: 60 });
      expect(calls()[2].params).toEqual({ session_id: 's1' });
    });

    it('keeps the session when a resumed retrieval is still not ready', async () => {
      const notReady = { data: { resources: {} } };
      const { ctx, calls } = makeCtx(Array(10).fill(notReady));
      await expect(
        retrieveFile(ctx, {
          device_id: AID,
          file_path: 'C:\\x',
          timeout: 5,
          batch_get_cmd_req_id: 'bgc-1',
          session_id: 's1',
        })
      ).resolves.toEqual({ complete: false, session_id: 's1', batch_get_cmd_req_id: 'bgc-1' });
      expect(calls().some((c) => c.method === 'DELETE' || c.method === 'POST')).toBe(false);
    });

    it('never deletes the caller-supplied session when a resumed poll fails', async () => {
      const { ctx, calls } = makeCtx([
        { status: 400, data: { errors: [{ code: 400, message: 'bad request id' }] } },
      ]);
      await expect(
        retrieveFile(ctx, {
          device_id: AID,
          file_path: 'C:\\x',
          batch_get_cmd_req_id: 'bgc-other',
          session_id: 'someone-elses-session',
        })
      ).rejects.toThrow('bad request id');
      expect(calls().filter((c) => c.method === 'DELETE')).toEqual([]);
    });

    it('closes only the session Falcon reports for the retrieval, not the one the caller passed', async () => {
      const archive = Uint8Array.from(Buffer.from('7z'));
      const { ctx, calls } = makeCtx([
        {
          data: {
            resources: { [AID]: { session_id: 'falcon-s', sha256: SHA, name: 'b.txt', size: 2 } },
          },
        },
        { data: archive.buffer },
        { status: 204, data: null },
      ]);
      await expect(
        retrieveFile(ctx, {
          device_id: AID,
          file_path: 'C:\\b.txt',
          batch_get_cmd_req_id: 'bgc-1',
          session_id: 'caller-s',
        })
      ).resolves.toMatchObject({ complete: true, session_id: 'falcon-s' });
      expect(
        calls()
          .filter((c) => c.method === 'DELETE')
          .map((c) => c.params)
      ).toEqual([{ session_id: 'falcon-s' }]);
    });

    it('deletes nothing on resume when Falcon reports no session for the file', async () => {
      const archive = Uint8Array.from(Buffer.from('7z'));
      const { ctx, calls } = makeCtx([
        { data: { resources: { [AID]: { sha256: SHA, name: 'b.txt', size: 2 } } } },
        { data: archive.buffer },
      ]);
      await expect(
        retrieveFile(ctx, {
          device_id: AID,
          file_path: 'C:\\b.txt',
          batch_get_cmd_req_id: 'bgc-1',
          session_id: 'caller-s',
        })
      ).resolves.toMatchObject({ complete: true });
      expect(calls().filter((c) => c.method === 'DELETE')).toEqual([]);
    });
  });

  describe('closing batch sessions', () => {
    it('stops starting deletes after the cleanup time budget and still returns the results', async () => {
      const ids = Array.from({ length: 25 }, (_, i) => i.toString(16).padStart(32, '0'));
      const hosts = Object.fromEntries(
        ids.map((id, i) => [id, { session_id: `s${i}`, errors: [] }])
      );
      const combined = Object.fromEntries(
        ids.map((id, i) => [
          id,
          { session_id: `s${i}`, complete: true, stdout: 'ok', stderr: '', errors: [] },
        ])
      );
      const { ctx, request } = makeCtx([]);
      request.mockImplementation(async (config: { url: string; method: string }) => {
        if (config.url.endsWith('/batch-init-session/v1')) {
          return {
            status: 201,
            headers: {},
            data: { batch_id: 'b', resources: hosts, errors: [] },
          };
        }
        if (config.url.endsWith('/batch-command/v1')) {
          return {
            status: 201,
            headers: {},
            data: { combined: { resources: combined }, errors: [] },
          };
        }
        now += 40_000; // every delete is slow
        return { status: 204, headers: {}, data: null };
      });
      const result = await runBatchCommand(ctx, 'read_only', { endpoint_ids: ids, command: 'ls' });
      const deletes = request.mock.calls.filter(([config]) => config.method === 'DELETE');
      expect(deletes).toHaveLength(10);
      expect(result.results).toHaveLength(25);
      expect(ctx.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Left 15 Real Time Response sessions open')
      );
    });

    it('sends each cleanup delete once, with the time left in the budget as its timeout', async () => {
      const ids = Array.from({ length: 2 }, (_, i) => i.toString(16).padStart(32, '0'));
      const hosts = Object.fromEntries(
        ids.map((id, i) => [id, { session_id: `s${i}`, errors: [] }])
      );
      const combined = Object.fromEntries(
        ids.map((id, i) => [
          id,
          { session_id: `s${i}`, complete: true, stdout: 'ok', stderr: '', errors: [] },
        ])
      );
      const { ctx, request } = makeCtx([]);
      request.mockImplementation(async (config: { url: string; method: string }) => {
        if (config.url.endsWith('/batch-init-session/v1')) {
          return {
            status: 201,
            headers: {},
            data: { batch_id: 'b', resources: hosts, errors: [] },
          };
        }
        if (config.url.endsWith('/batch-command/v1')) {
          now += 5_000;
          return {
            status: 201,
            headers: {},
            data: { combined: { resources: combined }, errors: [] },
          };
        }
        // A rate-limited delete is not retried during cleanup.
        return { status: 429, headers: {}, data: { errors: [{ message: 'rate limited' }] } };
      });
      const result = await runBatchCommand(ctx, 'read_only', { endpoint_ids: ids, command: 'ls' });
      const deletes = request.mock.calls.filter(([config]) => config.method === 'DELETE');
      expect(deletes).toHaveLength(2);
      for (const [config] of deletes) {
        expect(config.timeout).toBeLessThanOrEqual(30_000);
        expect(config.timeout).toBeGreaterThanOrEqual(1_000);
      }
      expect(result.results).toHaveLength(2);
    });

    it('deletes the sessions of a large batch at most 10 at a time', async () => {
      const ids = Array.from({ length: 25 }, (_, i) => i.toString(16).padStart(32, '0'));
      const hosts = Object.fromEntries(
        ids.map((id, i) => [id, { session_id: `s${i}`, errors: [] }])
      );
      const combined = Object.fromEntries(
        ids.map((id, i) => [
          id,
          { session_id: `s${i}`, complete: true, stdout: '', stderr: '', errors: [] },
        ])
      );
      let inFlight = 0;
      let peak = 0;
      const { ctx, request } = makeCtx([]);
      request.mockImplementation(async (config: { url: string; method: string }) => {
        if (config.url.endsWith('/batch-init-session/v1')) {
          return {
            status: 201,
            headers: {},
            data: { batch_id: 'b', resources: hosts, errors: [] },
          };
        }
        if (config.url.endsWith('/batch-command/v1')) {
          return {
            status: 201,
            headers: {},
            data: { combined: { resources: combined }, errors: [] },
          };
        }
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setImmediate(resolve));
        inFlight -= 1;
        return { status: 204, headers: {}, data: null };
      });
      await runBatchCommand(ctx, 'read_only', { endpoint_ids: ids, command: 'ls' });
      const deletes = request.mock.calls.filter(([config]) => config.method === 'DELETE');
      expect(deletes).toHaveLength(25);
      expect(peak).toBe(10);
    });
  });
});
