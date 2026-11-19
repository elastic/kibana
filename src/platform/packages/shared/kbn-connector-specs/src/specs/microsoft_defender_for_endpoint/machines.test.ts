/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { MdeApiError } from './client';
import { machineActions } from './machines';

const API_URL = 'https://api.securitycenter.microsoft.com/api';
const MACHINE_ID = '1e5bc9d7e413ddd7902c2932e418702b84d0cc07';
const SHA1 = '4388963aaa83afe2042a46a3c017ad50bdcdafb3';

const httpError = (status: number, data: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers: {}, statusText: '' },
  });

const createContext = () => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { apiUrl: API_URL },
    secrets: { authType: 'oauth_client_credentials' },
    log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const pendingAction = {
  id: 'b3f4c3a1-0000-4000-8000-000000000001',
  type: 'Isolate',
  status: 'Pending',
  machineId: MACHINE_ID,
  requestor: 'analyst@contoso.com',
  creationDateTimeUtc: '2026-11-12T10:00:00Z',
};

const run = (name: string, ctx: ActionContext, input: Record<string, unknown>) =>
  machineActions[name].handler(ctx, machineActions[name].input.parse(input));

describe('Microsoft Defender for Endpoint machine actions', () => {
  describe('pending-action conflicts', () => {
    const inProgress = httpError(400, {
      error: { code: 'BadRequest', message: 'Action is already in progress' },
    });
    const liveResponseBusy = httpError(400, {
      error: { code: 'ActiveRequestAlreadyExists', message: 'An active request already exists' },
    });

    it('names the conflicting machine action, found with one list call', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(inProgress).mockResolvedValueOnce({
        data: { value: [{ ...pendingAction, type: 'RunAntiVirusScan' }, pendingAction] },
      });

      const error = await run('isolateHost', ctx, {
        machineId: MACHINE_ID,
        comment: 'test',
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(MdeApiError);
      expect((error as MdeApiError).conflictingAction).toEqual(pendingAction);
      expect((error as Error).message).toContain(
        `Conflicting machine action: id=${pendingAction.id}, type=Isolate, status=Pending, requestor=analyst@contoso.com, creationDateTimeUtc=2026-11-12T10:00:00Z.`
      );
      expect(request).toHaveBeenCalledTimes(2);
      expect(request.mock.calls[1][0]).toMatchObject({
        method: 'GET',
        url: `${API_URL}/machineactions`,
        params: {
          $filter: `machineId eq '${MACHINE_ID}' and (status eq 'Pending' or status eq 'InProgress')`,
          $top: 20,
        },
      });
    });

    it('handles the ActiveRequestAlreadyExists form of live response', async () => {
      const { ctx, request } = createContext();
      const liveAction = { ...pendingAction, type: 'LiveResponse', status: 'InProgress' };
      request
        .mockRejectedValueOnce(liveResponseBusy)
        .mockResolvedValueOnce({ data: { value: [liveAction] } });

      await expect(
        run('getFile', ctx, {
          machineId: MACHINE_ID,
          comment: 'collect',
          path: 'C:\\temp\\a.txt',
        })
      ).rejects.toThrow(/ActiveRequestAlreadyExists.*type=LiveResponse, status=InProgress/s);
    });

    // Exact live answers (tenant test, 2026-11): the message names the pending action.
    const ISOLATE_ID = '172ba902-c562-42c6-a025-3637dda40563';
    const UNISOLATE_ID = '32624541-4c43-44ef-a152-e80fd70d019d';
    const isolateStillActive = httpError(400, {
      error: {
        code: 'BadRequest',
        message: `Cannot isolate device because Isolate action: ${ISOLATE_ID} is still active.`,
      },
    });
    const unisolateStillActive = httpError(400, {
      error: {
        code: 'BadRequest',
        message: `Cannot unisolate device because Unisolate action: ${UNISOLATE_ID} is still active.`,
      },
    });
    const actionNotFound = (id: string) =>
      httpError(404, {
        error: { code: 'ResourceNotFound', message: `Machine Action ${id} was not found` },
      });

    it('reads the action named in the live "is still active" message with one GET', async () => {
      const { ctx, request } = createContext();
      const named = { ...pendingAction, id: ISOLATE_ID, status: 'InProgress' };
      request
        .mockRejectedValueOnce(isolateStillActive)
        .mockResolvedValueOnce({ data: { '@odata.context': 'x', ...named } });

      const error = await run('isolateHost', ctx, {
        machineId: MACHINE_ID,
        comment: 'test',
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(MdeApiError);
      expect((error as MdeApiError).status).toBe(400);
      expect((error as MdeApiError).conflictingAction).toEqual(named);
      expect((error as Error).message).toContain(
        `HTTP 400 BadRequest: Cannot isolate device because Isolate action: ${ISOLATE_ID} is still active.`
      );
      expect((error as Error).message).toContain(
        `Conflicting machine action: id=${ISOLATE_ID}, type=Isolate, status=InProgress, requestor=analyst@contoso.com, creationDateTimeUtc=2026-11-12T10:00:00Z.`
      );
      expect(request).toHaveBeenCalledTimes(2);
      expect(request.mock.calls[1][0]).toMatchObject({
        method: 'GET',
        url: `${API_URL}/machineactions/${ISOLATE_ID}`,
      });
    });

    it('falls back to the $filter lookup when the named action still answers 404', async () => {
      const { ctx, request } = createContext();
      const named = { ...pendingAction, id: UNISOLATE_ID, type: 'Unisolate' };
      request
        .mockRejectedValueOnce(unisolateStillActive)
        .mockRejectedValueOnce(actionNotFound(UNISOLATE_ID))
        .mockResolvedValueOnce({ data: { value: [pendingAction, named] } });

      const error = await run('releaseHost', ctx, {
        machineId: MACHINE_ID,
        comment: 'test',
      }).catch((e: unknown) => e);

      expect((error as MdeApiError).conflictingAction).toEqual(named);
      expect((error as Error).message).toContain(
        `Conflicting machine action: id=${UNISOLATE_ID}, type=Unisolate, status=Pending`
      );
      expect(request).toHaveBeenCalledTimes(3);
      expect(request.mock.calls[2][0]).toMatchObject({ url: `${API_URL}/machineactions` });
    });

    it('reports the id and type from the message when neither lookup finds the action', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(isolateStillActive)
        .mockRejectedValueOnce(actionNotFound(ISOLATE_ID))
        .mockResolvedValueOnce({ data: { value: [] } });

      const error = await run('isolateHost', ctx, {
        machineId: MACHINE_ID,
        comment: 'test',
      }).catch((e: unknown) => e);

      expect((error as MdeApiError).conflictingAction).toEqual({ id: ISOLATE_ID, type: 'Isolate' });
      expect((error as Error).message).toMatch(
        new RegExp(
          `Conflicting machine action: id=${ISOLATE_ID}, type=Isolate, status=unknown.*poll getActions with this actionId`
        )
      );
    });

    it('still returns the conflict error when the lookup fails', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(inProgress)
        .mockRejectedValueOnce(httpError(403, { error: { code: 'Forbidden', message: 'no' } }));

      const error = await run('runAntivirusScan', ctx, {
        machineId: MACHINE_ID,
        comment: 'test',
        scanType: 'Quick',
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(MdeApiError);
      expect((error as Error).message).toMatch(
        /Action is already in progress.*could not be looked up \(.*HTTP 403/s
      );
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('says when no pending action was found', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(inProgress).mockResolvedValueOnce({ data: { value: [] } });

      await expect(
        run('releaseHost', ctx, { machineId: MACHINE_ID, comment: 'test' })
      ).rejects.toThrow(/No Pending or InProgress machine action was found/);
    });

    it('does not look anything up for other errors', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(
        httpError(400, { error: { code: 'InvalidInput', message: 'Bad comment' } })
      );

      await expect(
        run('isolateHost', ctx, { machineId: MACHINE_ID, comment: 'test' })
      ).rejects.toThrow(/InvalidInput/);
      expect(request).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActions', () => {
    const ACTION_ID = '82eaab7f-7a24-47d4-a761-d6d172ccae94';

    it('polls one action by ID with an id filter and returns a page', async () => {
      const { ctx, request } = createContext();
      const action = { ...pendingAction, id: ACTION_ID, status: 'Succeeded' };
      request.mockResolvedValueOnce({ data: { value: [action] } });

      await expect(run('getActions', ctx, { actionId: ACTION_ID })).resolves.toEqual({
        value: [action],
        count: 1,
        hasMore: false,
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'GET',
        url: `${API_URL}/machineactions`,
        params: { $filter: `id eq ${ACTION_ID}`, $top: 100 },
      });
    });

    it('combines the field filters with a caller filter', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce({ data: { value: [] } });

      await run('getActions', ctx, {
        machineId: MACHINE_ID,
        status: 'Pending',
        type: 'Isolate',
        filter: "requestor eq 'a@b.c'",
        top: 5,
        skip: 10,
      });
      expect(request.mock.calls[0][0].params).toEqual({
        $filter: `machineId eq '${MACHINE_ID}' and status eq 'Pending' and type eq 'Isolate' and (requestor eq 'a@b.c')`,
        $top: 5,
        $skip: 10,
      });
    });
  });

  describe('multi-value filters', () => {
    it('getActions sends a list of values as an OData in list', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce({ data: { value: [] } });

      const ids = ['82eaab7f-7a24-47d4-a761-d6d172ccae94', '5382f7ea-7557-4ab7-9782-d50480024a4e'];

      await run('getActions', ctx, {
        actionId: ids,
        machineId: MACHINE_ID,
        status: ['Pending', 'InProgress'],
        type: ['Isolate', 'Unisolate'],
      });
      expect(request.mock.calls[0][0].params.$filter).toBe(
        `id in (${ids.join(
          ','
        )}) and machineId eq '${MACHINE_ID}' and status in ('Pending','InProgress') and type in ('Isolate','Unisolate')`
      );
    });

    it('getAgentList sends device IDs and IP addresses as in lists and hostnames with or', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce({ data: { value: [] } });

      await run('getAgentList', ctx, {
        deviceId: [MACHINE_ID, MACHINE_ID],
        hostname: ['a', 'b'],
        ipAddress: ['10.0.0.1', '10.0.0.2'],
      });
      expect(request.mock.calls[0][0].params.$filter).toBe(
        `id in ('${MACHINE_ID}','${MACHINE_ID}') and (startswith(computerDnsName,'a') or startswith(computerDnsName,'b')) and lastIpAddress in ('10.0.0.1','10.0.0.2')`
      );
    });

    it('keeps 50 IP addresses in one in list, within the API node count limit', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce({ data: { value: [] } });
      const ips = Array.from({ length: 50 }, (_, i) => `10.0.0.${i + 1}`);

      await run('getAgentList', ctx, machineActions.getAgentList.input.parse({ ipAddress: ips }));
      expect(request.mock.calls[0][0].params.$filter).toBe(
        `lastIpAddress in (${ips.map((ip) => `'${ip}'`).join(',')})`
      );
    });

    it('accepts up to 10 hostnames, since each one is a startswith condition', () => {
      const hostnames = (count: number) => Array.from({ length: count }, (_, i) => `host${i}`);
      expect(() =>
        machineActions.getAgentList.input.parse({ hostname: hostnames(10) })
      ).not.toThrow();
      expect(() => machineActions.getAgentList.input.parse({ hostname: hostnames(11) })).toThrow();
    });

    it('rejects ipSeenAt with a list of IP addresses', () => {
      expect(() =>
        machineActions.getAgentList.input.parse({
          ipAddress: ['10.0.0.1', '10.0.0.2'],
          ipSeenAt: '2026-11-10T14:30:00Z',
        })
      ).toThrow(/single ipAddress/);
    });
  });

  describe('getAgentList', () => {
    it('builds the filter from deviceId, hostname, and ipAddress', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce({ data: { value: [{ id: MACHINE_ID }] } });

      await run('getAgentList', ctx, {
        deviceId: MACHINE_ID,
        hostname: 'desktop-01',
        ipAddress: '10.0.0.5',
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        url: `${API_URL}/machines`,
        params: {
          $filter: `id eq '${MACHINE_ID}' and startswith(computerDnsName,'desktop-01') and lastIpAddress eq '10.0.0.5'`,
          $top: 100,
        },
      });
    });

    it('uses findbyip when ipSeenAt is set', async () => {
      const { ctx, request } = createContext();
      const seenAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      request.mockResolvedValueOnce({ data: { value: [{ id: MACHINE_ID }] } });

      await expect(
        run('getAgentList', ctx, { ipAddress: '10.0.0.5', ipSeenAt: seenAt })
      ).resolves.toEqual({ value: [{ id: MACHINE_ID }], count: 1, hasMore: false });
      expect(request.mock.calls[0][0].url).toBe(
        `${API_URL}/machines/findbyip(ip='10.0.0.5',timestamp=${seenAt})`
      );
    });

    it('rejects ipSeenAt without ipAddress or with other filters', () => {
      const seenAt = '2026-11-10T14:30:00Z';
      expect(() => machineActions.getAgentList.input.parse({ ipSeenAt: seenAt })).toThrow(
        /ipSeenAt needs a single ipAddress/
      );
      expect(() =>
        machineActions.getAgentList.input.parse({
          ipAddress: '10.0.0.5',
          ipSeenAt: seenAt,
          hostname: 'a',
        })
      ).toThrow(/cannot be combined with hostname/);
    });
  });

  describe('live response', () => {
    it('runScript requires a comment (the live API rejects a live response without one)', () => {
      expect(() =>
        machineActions.runScript.input.parse({ machineId: MACHINE_ID, scriptName: 'a.ps1' })
      ).toThrow();
      expect(() =>
        machineActions.getFile.input.parse({ machineId: MACHINE_ID, path: 'C:\\a.txt' })
      ).toThrow();
    });

    it('runScript sends one RunScript command with the script name, args, and comment', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce({ data: { ...pendingAction, type: 'LiveResponse' } });

      await run('runScript', ctx, {
        machineId: MACHINE_ID,
        comment: 'triage',
        scriptName: 'a.ps1',
        args: '-Days 7',
      });

      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'POST',
        url: `${API_URL}/machines/${MACHINE_ID}/runliveresponse`,
        data: {
          Commands: [
            {
              type: 'RunScript',
              params: [
                { key: 'ScriptName', value: 'a.ps1' },
                { key: 'Args', value: '-Days 7' },
              ],
            },
          ],
          Comment: 'triage',
        },
      });
    });

    it('runScript rejects a script name with a path', () => {
      expect(() =>
        machineActions.runScript.input.parse({
          machineId: MACHINE_ID,
          comment: 'c',
          scriptName: 'C:\\a.ps1',
        })
      ).toThrow(/without a path/);
    });

    it('getFile sends one GetFile command with the path', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce({ data: { ...pendingAction, type: 'LiveResponse' } });

      await run('getFile', ctx, { machineId: MACHINE_ID, comment: 'evidence', path: 'C:\\a.txt' });

      expect(request.mock.calls[0][0].data).toEqual({
        Commands: [{ type: 'GetFile', params: [{ key: 'Path', value: 'C:\\a.txt' }] }],
        Comment: 'evidence',
      });
    });

    it('getActionResults reads the download link of command 0', async () => {
      const { ctx, request } = createContext();
      const id = '82eaab7f-7a24-47d4-a761-d6d172ccae94';
      request.mockResolvedValueOnce({ data: { '@odata.context': 'x', value: 'https://dl' } });

      await expect(run('getActionResults', ctx, { actionId: id })).resolves.toEqual({
        value: 'https://dl',
      });
      expect(request.mock.calls[0][0].url).toBe(
        `${API_URL}/machineactions/${id}/GetLiveResponseResultDownloadLink(index=0)`
      );
    });
  });

  describe('new response actions', () => {
    it.each([
      ['restrictAppExecution', 'restrictCodeExecution', { Comment: 'c' }],
      ['removeAppRestriction', 'unrestrictCodeExecution', { Comment: 'c' }],
      ['stopAndQuarantineFile', 'StopAndQuarantineFile', { Comment: 'c', Sha1: SHA1 }],
    ])('%s starts a machine action and returns it', async (name, operation, body) => {
      const { ctx, request } = createContext();
      const action = { '@odata.context': 'x', ...pendingAction, type: operation };
      request.mockResolvedValueOnce({ data: action });

      const result = await run(name, ctx, { machineId: MACHINE_ID, comment: 'c', sha1: SHA1 });

      expect(result).toEqual({ ...pendingAction, type: operation });
      expect(request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${API_URL}/machines/${MACHINE_ID}/${operation}`,
        params: undefined,
        data: body,
        maxRedirects: 0,
      });
    });

    it('stopAndQuarantineFile rejects a SHA-256', () => {
      expect(() =>
        machineActions.stopAndQuarantineFile.input.parse({
          machineId: MACHINE_ID,
          comment: 'c',
          sha1: 'a'.repeat(64),
        })
      ).toThrow(/SHA-1/);
    });

    it.each(['restrictAppExecution', 'removeAppRestriction'])(
      '%s explains InvalidDefenderRunningMode (Defender Antivirus not in active mode)',
      async (name) => {
        const { ctx, request } = createContext();
        request.mockRejectedValueOnce(
          httpError(400, {
            error: {
              code: 'InvalidDefenderRunningMode',
              message: 'Invalid Windows Defender Anti-Virus running mode: 4',
            },
          })
        );

        const error = await run(name, ctx, { machineId: MACHINE_ID, comment: 'c' }).catch(
          (e: unknown) => e
        );

        expect(error).toBeInstanceOf(MdeApiError);
        expect((error as MdeApiError).code).toBe('InvalidDefenderRunningMode');
        expect((error as Error).message).toContain(
          'HTTP 400 InvalidDefenderRunningMode: Invalid Windows Defender Anti-Virus running mode: 4'
        );
        expect((error as Error).message).toMatch(
          /needs Microsoft Defender Antivirus in active mode on the device/
        );
        // Not a pending-action conflict: no lookup call.
        expect(request).toHaveBeenCalledTimes(1);
      }
    );

    it('does not retry a machine action on 5xx', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(503, {}));

      await expect(
        run('restrictAppExecution', ctx, { machineId: MACHINE_ID, comment: 'c' })
      ).rejects.toThrow(/HTTP 503/);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each(['Add', 'Remove'])(
      'updateMachineTag posts the tag with Action %s and returns the device',
      async (action) => {
        const { ctx, request } = createContext();
        const machine = { id: MACHINE_ID, machineTags: ['handled'] };
        request.mockResolvedValueOnce({ data: machine });

        await expect(
          run('updateMachineTag', ctx, { machineId: MACHINE_ID, tag: ' handled ', action })
        ).resolves.toEqual(machine);
        expect(request).toHaveBeenCalledWith({
          method: 'POST',
          url: `${API_URL}/machines/${MACHINE_ID}/tags`,
          params: undefined,
          data: { Value: 'handled', Action: action },
          maxRedirects: 0,
        });
      }
    );

    it('cancelAction posts the required comment and returns the cancelled action', async () => {
      const { ctx, request } = createContext();
      const cancelled = { '@odata.context': 'x', ...pendingAction, status: 'Cancelled' };
      request.mockResolvedValueOnce({ data: cancelled });

      await expect(
        run('cancelAction', ctx, { actionId: pendingAction.id, comment: 'false positive' })
      ).resolves.toEqual({ ...pendingAction, status: 'Cancelled' });
      expect(request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${API_URL}/machineactions/${pendingAction.id}/cancel`,
        params: undefined,
        data: { Comment: 'false positive' },
        maxRedirects: 0,
      });
    });

    it('cancelAction rejects a missing comment (the API answers 400 $Comment is missing.)', () => {
      expect(() =>
        machineActions.cancelAction.input.parse({ actionId: pendingAction.id })
      ).toThrow();
    });

    it('rejects an empty tag', () => {
      expect(() =>
        machineActions.updateMachineTag.input.parse({
          machineId: MACHINE_ID,
          tag: '  ',
          action: 'Add',
        })
      ).toThrow();
    });
  });
});
