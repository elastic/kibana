/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * V1 parity: every carried test of the V1 connector (`.crowdstrike`), re-stated against V2.
 * The tag `[C-v1-<n>]` is the soar test matrix id. Where V2 changed behaviour on purpose
 * (documented in the TDD migration section) the test asserts V2's behaviour and says so in a
 * `V1 differs:` comment; those are listed in tdd/deviations_for_alignment.md.
 */

import type { AxiosInstance } from 'axios';
import { loggerMock } from '@kbn/logging-mocks';
import type { ActionContext } from '../../connector_spec';
import { OAuth } from '../../auth_types/oauth';
import { Crowdstrike2 } from './crowdstrike2';
import { falconRequest, getBaseUrl, serializeParams, timing } from './client';
import { initBatchSession, runBatchCommand } from './rtr';

const AID = '0123456789abcdef0123456789abcdef';
const AID2 = 'fedcba9876543210fedcba9876543210';
const BASE = 'https://api.crowdstrike.com';
const TOKEN_URL = `${BASE}/oauth2/token`;
const SECRETS = {
  tokenUrl: TOKEN_URL,
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

interface Reply {
  status?: number;
  data?: unknown;
  headers?: Record<string, unknown>;
}

const makeCtx = (
  replies: Reply[],
  opts: { config?: object; secrets?: object; fallback?: Reply } = {}
) => {
  const request = jest.fn();
  for (const reply of replies) {
    request.mockResolvedValueOnce({ status: 200, headers: {}, data: {}, ...reply });
  }
  request.mockResolvedValue({ status: 200, headers: {}, data: {}, ...opts.fallback });
  const ctx = {
    client: { request } as unknown as AxiosInstance,
    config: opts.config ?? { region: 'us-1' },
    secrets: opts.secrets ?? SECRETS,
    log: loggerMock.create(),
    getClient: jest.fn(),
  } as unknown as ActionContext;
  const sent = () => request.mock.calls.map(([c]) => c);
  return { ctx, request, sent };
};

const action = (name: string) => {
  const definition = Crowdstrike2.actions[name];
  if (!definition) {
    throw new Error(`no action ${name}`);
  }
  return definition;
};

const run = async (name: string, input: unknown, replies: Reply[] = [], opts = {}) => {
  const { ctx, request, sent } = makeCtx(replies, opts);
  const parsed = action(name).input.parse(input);
  const result = await action(name).handler(ctx, parsed);
  return { result, request, sent };
};

/** The host state read that containHost and liftContainment send before the write. */
const hostsIn = (status: string, ...ids: string[]): Reply => ({
  data: { resources: ids.map((id) => ({ device_id: id, status })) },
});

const fail = (status: number, message: string): Reply => ({
  status,
  data: { meta: {}, resources: [], errors: [{ code: status, message }] },
});

const rtrInit = (batchId: unknown = 'test-batch-123'): Reply => ({
  status: 201,
  data: { batch_id: batchId, resources: { [AID]: { session_id: 's1', errors: [] } }, errors: [] },
});

/** Falcon's reply to the per-host session delete that ends every batch command (204, no body). */
const rtrSessionDeleted: Reply = { status: 204, data: null };

const rtrCommand = (host = AID): Reply => ({
  status: 201,
  data: {
    combined: {
      resources: {
        [host]: {
          session_id: 's1',
          task_id: 't1',
          complete: true,
          stdout: 'out',
          stderr: '',
          base_command: 'ls',
          errors: [],
        },
      },
    },
    meta: { query_time: 0.1 },
    errors: [],
  },
});

describe('CrowdStrike Falcon V1 parity', () => {
  let now: number;
  // The clock moves 5 minutes right after the session open has been timestamped.
  let armed: boolean;
  beforeEach(() => {
    now = 1_000_000;
    armed = false;
    jest.spyOn(timing, 'now').mockImplementation(() => {
      const value = now;
      if (armed) {
        armed = false;
        now += 5 * 60_000;
      }
      return value;
    });
    jest.spyOn(timing, 'sleep').mockImplementation(async (ms: number) => {
      now += ms;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  describe('host actions, details and online status', () => {
    it('[C-v1-049] containHost POSTs ids to devices-actions with action_name=contain', async () => {
      // V1 differs: V2 first reads the hosts' state (Hosts: Read) and sends only the hosts not yet in it.
      const { result, sent } = await run('containHost', { ids: [AID, AID2] }, [
        hostsIn('normal', AID, AID2),
        { status: 202, data: { resources: [{ id: 'testid', path: 'testpath' }], errors: [] } },
      ]);
      const [read, call] = sent();
      expect(read.url).toBe(`${BASE}/devices/entities/devices/v2`);
      expect(read.data).toEqual({ ids: [AID, AID2] });
      expect(call.method).toBe('POST');
      expect(call.url).toBe(`${BASE}/devices/entities/devices-actions/v2`);
      expect(call.params).toEqual({ action_name: 'contain' });
      expect(call.data).toEqual({ ids: [AID, AID2] });
      expect(call.headers).toEqual(expect.objectContaining({ Accept: 'application/json' }));
      expect((result as { resources: unknown[] }).resources).toEqual([
        { id: 'testid', path: 'testpath' },
      ]);
    });

    it('[C-v1-050] getAgentDetails sends the ids and returns the host records', async () => {
      // V1 differs: POST with a JSON body (vendor max 5000), and each record carries containment_state.
      const { result, sent } = await run('getAgentDetails', { ids: [AID, AID2] }, [
        { data: { resources: [{ device_id: AID, status: 'normal' }] } },
      ]);
      const [call] = sent();
      expect(call.method).toBe('POST');
      expect(call.url).toBe(`${BASE}/devices/entities/devices/v2`);
      expect(call.data).toEqual({ ids: [AID, AID2] });
      expect((result as { resources: unknown[] }).resources).toEqual([
        { device_id: AID, status: 'normal', containment_state: 'normal' },
      ]);
    });

    it('[C-v1-051] getAgentOnlineStatus GETs online-state with the ids as repeated parameters', async () => {
      // V1 differs: repeated ids= (the vendor format) instead of one comma-joined value.
      const { result, sent } = await run('getAgentOnlineStatus', { ids: [AID, AID2] }, [
        { data: { resources: [{ id: AID, state: 'online' }] } },
      ]);
      const [call] = sent();
      expect(call.method).toBe('GET');
      expect(call.url).toBe(`${BASE}/devices/entities/online-state/v1`);
      expect(call.params).toEqual({ ids: [AID, AID2] });
      expect(call.paramsSerializer.serialize(call.params)).toBe(`ids=${AID}&ids=${AID2}`);
      expect((result as { resources: unknown[] }).resources).toEqual([
        { id: AID, state: 'online' },
      ]);
    });
  });

  describe('error handling through the public actions', () => {
    it('[C-v1-052] a server error, a network failure and a timeout each end as an error', async () => {
      const server = makeCtx([], { fallback: fail(500, 'Basic API error') });
      await expect(action('getAgentDetails').handler(server.ctx, { ids: [AID] })).rejects.toThrow(
        /Status code: 500\. Message: Basic API error/
      );

      const network = makeCtx([]);
      network.request.mockRejectedValue({ message: 'Network error', code: 'NETWORK_ERROR' });
      await expect(action('containHost').handler(network.ctx, { ids: [AID] })).rejects.toThrow(
        /Could not reach api\.crowdstrike\.com: Network error/
      );

      const timeout = makeCtx([]);
      timeout.request.mockRejectedValue({ message: 'Request timeout', code: 'TIMEOUT' });
      await expect(
        action('getAgentOnlineStatus').handler(timeout.ctx, { ids: [AID] })
      ).rejects.toThrow(/Could not reach api\.crowdstrike\.com: Request timeout/);
    });

    it('[C-v1-053] the vendor error message reaches the caller from every public method', async () => {
      const cases: Array<[string, unknown]> = [
        ['getAgentDetails', { ids: [AID] }],
        ['containHost', { ids: [AID] }],
        ['getAgentOnlineStatus', { ids: [AID] }],
        ['getRTRCloudScripts', {}],
      ];
      for (const [name, input] of cases) {
        const { ctx } = makeCtx([], { fallback: fail(400, 'Test error message') });
        const parsed = action(name).input.parse(input);
        await expect(action(name).handler(ctx, parsed)).rejects.toThrow(/Test error message/);
      }
    });

    it('[C-v1-054] a 403 is reported the same way by every method, naming the scope', async () => {
      for (const [name, input] of [
        ['getAgentDetails', { ids: [AID] }],
        ['containHost', { ids: [AID] }],
        ['getAgentOnlineStatus', { ids: [AID] }],
      ] as Array<[string, unknown]>) {
        const { ctx } = makeCtx([], { fallback: fail(403, 'Authentication failed') });
        const parsed = action(name).input.parse(input);
        await expect(action(name).handler(ctx, parsed)).rejects.toThrow(
          /Status code: 403\. Message: Authentication failed; the API client needs the Hosts/
        );
      }
    });
  });

  describe('token management (the platform owns the token; the connector repeats once on 401)', () => {
    it('[C-v1-055] a valid token needs no token request: one call, no call to the token URL', async () => {
      const { sent } = await run('getAgentDetails', { ids: [AID, AID2] }, [
        { data: { resources: [{}] } },
      ]);
      expect(sent()).toHaveLength(1);
      expect(sent()[0].url).not.toContain('/oauth2/token');
    });

    it('[C-v1-056] a failing request surfaces its message', async () => {
      const { ctx, request } = makeCtx([]);
      request.mockRejectedValueOnce({ code: 400, message: 'something goes wrong' });
      await expect(action('getAgentDetails').handler(ctx, { ids: [AID, AID2] })).rejects.toThrow(
        'something goes wrong'
      );
    });

    it('[C-v1-057] an expired token is replaced once and the call repeated with the new one', async () => {
      const { result, sent } = await run('getAgentDetails', { ids: [AID, AID2] }, [
        fail(401, 'access denied, invalid bearer token'),
        { data: { access_token: 'fresh-token' } },
        { data: { resources: [{}] } },
      ]);
      const calls = sent();
      expect(calls).toHaveLength(3);
      expect(calls[1].url).toBe(TOKEN_URL);
      expect(calls[2].headers).toEqual(
        expect.objectContaining({ Authorization: 'Bearer fresh-token' })
      );
      expect((result as { resources: unknown[] }).resources).toEqual([
        { containment_state: 'unknown' },
      ]);
    });

    it('[C-v1-058] authentication that fails completely ends as an error after the request was attempted', async () => {
      const { ctx, request } = makeCtx([], {
        fallback: { status: 403, data: fail(403, 'Access denied').data },
      });
      await expect(action('getAgentDetails').handler(ctx, { ids: [AID, AID2] })).rejects.toThrow(
        /Access denied/
      );
      expect(request).toHaveBeenCalled();
    });
  });

  describe('construction and configuration', () => {
    it('[C-v1-059] the connector is defined with its type id and 50 actions', () => {
      expect(Crowdstrike2.metadata.id).toBe('.crowdstrike2');
      expect(Object.keys(Crowdstrike2.actions)).toHaveLength(50);
    });

    it('[C-v1-060] a custom API URL with a trailing slash gives a clean request URL', async () => {
      // V1 differs: V1 pinned the double slash ("//devices/..."); V2 uses the URL origin.
      const { sent } = await run(
        'getAgentDetails',
        { ids: [AID] },
        [{ data: { resources: [{}] } }],
        {
          config: { region: 'custom', apiUrl: 'https://api.crowdstrike.com/' },
          secrets: SECRETS,
        }
      );
      expect(sent()[0].url).toBe('https://api.crowdstrike.com/devices/entities/devices/v2');
    });

    it('[C-v1-061] the base actions work with no RTR feature switch (V2 has none)', async () => {
      expect(action('getAgentDetails')).toBeDefined();
      expect(action('executeRTRCommand')).toBeDefined();
      const { result } = await run('getAgentDetails', { ids: [AID] }, [
        { data: { resources: [{ device_id: AID }] } },
      ]);
      expect((result as { resources: unknown[] }).resources).toHaveLength(1);
    });

    it('[C-v1-062] an authenticated request is made on first use', async () => {
      const { result, request } = await run('getAgentDetails', { ids: [AID] }, [
        { data: { resources: [{}] } },
      ]);
      expect(request).toHaveBeenCalledTimes(1);
      expect((result as { resources: unknown[] }).resources).toHaveLength(1);
    });
  });

  describe('RTR command execution and validation', () => {
    it('[C-v1-063] an unsupported RTR command is rejected with a clear message and nothing is sent', async () => {
      const { ctx, request } = makeCtx([rtrInit()]);
      const input = { endpoint_ids: [AID, AID2], command: 'unsupported_command' };
      await expect(action('executeRTRCommand').handler(ctx, input)).rejects.toThrow(/not allowed/);
      await expect(action('executeRTRCommand').handler(ctx, input)).rejects.toThrow(
        "'unsupported_command' is not allowed in the read-only Real Time Response tier"
      );
      expect(request).not.toHaveBeenCalled();
    });

    it('[C-v1-064] a session that cannot be opened ends as an error', async () => {
      // V1 differs: `runscript` is not read-only in V2 (responder tier), so the read-only action uses `ls`.
      const { ctx } = makeCtx([], { fallback: fail(400, 'Session initialization failed') });
      await expect(
        action('executeRTRCommand').handler(ctx, { command: 'ls', endpoint_ids: [AID, AID2] })
      ).rejects.toThrow(/Session initialization failed/);
    });

    it('[C-v1-065] a complex command is split into base command and full command string', async () => {
      const command = 'runscript -CloudFile="Get-Process" -CommandLine="-Name notepad"';
      const { result, sent } = await run(
        'batchActiveResponderExecuteRTR',
        { command, endpoint_ids: [AID, AID2] },
        [rtrInit(), rtrCommand()]
      );
      const [, commandCall] = sent();
      expect(commandCall.url).toBe(
        `${BASE}/real-time-response/combined/batch-active-responder-command/v1`
      );
      expect(commandCall.data).toEqual({
        batch_id: 'test-batch-123',
        base_command: 'runscript',
        command_string: command,
      });
      expect((result as { resources: Record<string, unknown> }).resources[AID]).toMatchObject({
        stdout: 'out',
      });
    });

    it('[C-v1-066] a command that fails after the session opened ends as an error, after two requests and the session delete', async () => {
      // V1 differs: V1 left the batch session to expire; V2 deletes each opened host session, also after a failed command.
      const { ctx, request } = makeCtx([rtrInit()]);
      request.mockRejectedValueOnce(new Error('placeholder'));
      request.mockReset();
      request.mockResolvedValueOnce({ status: 201, headers: {}, data: rtrInit().data });
      request.mockResolvedValueOnce({
        status: 400,
        headers: {},
        data: fail(400, 'Command execution failed').data,
      });
      await expect(
        action('batchActiveResponderExecuteRTR').handler(ctx, {
          command: 'runscript -help',
          endpoint_ids: [AID, AID2],
        })
      ).rejects.toThrow(/Command execution failed/);
      expect(request).toHaveBeenCalledTimes(3);
      expect(request.mock.calls[2][0]).toMatchObject({
        method: 'DELETE',
        url: `${BASE}/real-time-response/entities/sessions/v1`,
        params: { session_id: 's1' },
      });
    });

    it('[C-v1-067] a supported command reaches the session, an unsupported one sends nothing', async () => {
      const supported = makeCtx([], { fallback: fail(400, 'Test session error') });
      await expect(
        action('batchActiveResponderExecuteRTR').handler(supported.ctx, {
          command: 'runscript -help',
          endpoint_ids: [AID],
        })
      ).rejects.toThrow(/Test session error/);
      expect(supported.request).toHaveBeenCalled();

      const unsupported = makeCtx([]);
      await expect(
        action('executeRTRCommand').handler(unsupported.ctx, {
          command: 'unsupported_command',
          endpoint_ids: [AID],
        })
      ).rejects.toThrow(/not allowed/);
      expect(unsupported.request).not.toHaveBeenCalled();
    });

    it('[C-v1-068] executeRTRCommand opens a batch session, then POSTs the command to batch-command', async () => {
      // V1 differs: the allow-list is the read-only tier (`runscript` moved to the responder tier).
      const { result, sent } = await run(
        'executeRTRCommand',
        { command: 'ls -la', endpoint_ids: [AID, AID2] },
        [rtrInit(), rtrCommand()]
      );
      const [init, command] = sent();
      expect(init.url).toBe(`${BASE}/real-time-response/combined/batch-init-session/v1`);
      expect(init.data).toEqual({ host_ids: [AID, AID2], queue_offline: false });
      expect(command.method).toBe('POST');
      expect(command.url).toBe(`${BASE}/real-time-response/combined/batch-command/v1`);
      expect(command.data).toMatchObject({ command_string: 'ls -la', batch_id: 'test-batch-123' });
      expect(result).toMatchObject({ batch_id: 'test-batch-123', complete: true });
    });

    it('[C-v1-069] batchActiveResponderExecuteRTR POSTs to the active-responder batch route', async () => {
      const { result, sent } = await run(
        'batchActiveResponderExecuteRTR',
        { command: 'runscript', endpoint_ids: [AID, AID2] },
        [rtrInit(), rtrCommand()]
      );
      expect(sent()[1].method).toBe('POST');
      expect(sent()[1].url).toBe(
        `${BASE}/real-time-response/combined/batch-active-responder-command/v1`
      );
      expect(result).toMatchObject({ batch_id: 'test-batch-123' });
    });

    it('[C-v1-070] batchAdminExecuteRTR POSTs to the admin batch route', async () => {
      const { result, sent } = await run(
        'batchAdminExecuteRTR',
        { command: 'runscript', endpoint_ids: [AID, AID2] },
        [rtrInit(), rtrCommand()]
      );
      expect(sent()[1].method).toBe('POST');
      expect(sent()[1].url).toBe(`${BASE}/real-time-response/combined/batch-admin-command/v1`);
      expect(result).toMatchObject({ batch_id: 'test-batch-123' });
    });

    it('[C-v1-071] getRTRCloudScripts GETs the scripts and returns them', async () => {
      // V1 differs: queries/scripts/v1 for the ids, then entities/scripts/v2 for the details (D-3).
      const { result, sent } = await run('getRTRCloudScripts', {}, [
        { data: { resources: ['s1'], meta: { pagination: { total: 1 } } } },
        { data: { resources: [{ id: 's1', name: 'collect' }] } },
      ]);
      expect(sent()[0].method).toBe('GET');
      expect(sent()[0].url).toBe(`${BASE}/real-time-response/queries/scripts/v1`);
      expect(sent()[1].url).toBe(`${BASE}/real-time-response/entities/scripts/v2`);
      expect((result as { resources: unknown[] }).resources).toEqual([
        { id: 's1', name: 'collect' },
      ]);
    });
  });

  describe('parameter serialization', () => {
    it('[C-v1-072] special characters in query parameters are percent-encoded', () => {
      // V1 differs: V2 uses form encoding (space as '+', '&' as %26, '+' as %2B); Falcon decodes both.
      expect(
        serializeParams({ 'test key': 'test value', 'special&chars': 'value with spaces' })
      ).toBe('test+key=test+value&special%26chars=value+with+spaces');
      expect(serializeParams({ filter: "a+b'c" })).toBe('filter=a%2Bb%27c');
    });

    it('[C-v1-073] an empty ids list is refused before anything is sent', () => {
      // V1 differs: V1 sent empty ids; Falcon requires at least one, so V2 rejects the input.
      expect(action('getAgentDetails').input.safeParse({ ids: [] }).success).toBe(false);
      expect(action('getAgentOnlineStatus').input.safeParse({ ids: [] }).success).toBe(false);
    });

    it('[C-v1-074] unicode in parameters is UTF-8 percent-encoded', () => {
      expect(serializeParams({ unicode: 'тест ñiño' })).toContain('%D1%82%D0%B5%D1%81%D1%82');
    });
  });

  describe('host action parameters', () => {
    it('[C-v1-075] containHost sends the action parameters as name/value pairs', async () => {
      const { sent } = await run(
        'containHost',
        { ids: [AID, AID2], actionParameters: { comment: 'Test containment', priority: 'high' } },
        [hostsIn('normal', AID, AID2), { status: 202, data: { resources: [{ id: AID }] } }]
      );
      expect(sent()[1].params).toEqual({ action_name: 'contain' });
      expect(sent()[1].data).toEqual({
        ids: [AID, AID2],
        action_parameters: [
          { name: 'comment', value: 'Test containment' },
          { name: 'priority', value: 'high' },
        ],
      });
    });

    it('[C-v1-076] liftContainment without action parameters sends only the ids', async () => {
      const { sent } = await run('liftContainment', { ids: [AID, AID2] }, [
        hostsIn('contained', AID, AID2),
        { status: 202, data: { resources: [{ id: AID }] } },
      ]);
      expect(sent()[1].params).toEqual({ action_name: 'lift_containment' });
      expect(sent()[1].data).toEqual({ ids: [AID, AID2] });
    });

    it('[C-v1-077] empty action parameters send an empty action_parameters list', async () => {
      const { sent } = await run('containHost', { ids: [AID], actionParameters: {} }, [
        hostsIn('normal', AID),
        { status: 202, data: { resources: [{ id: AID }] } },
      ]);
      expect(sent()[1].data).toEqual({ ids: [AID], action_parameters: [] });
    });

    it('[C-v1-078] action parameters with quotes, ampersands and spaces are sent unchanged', async () => {
      const { sent } = await run(
        'containHost',
        {
          ids: [AID],
          actionParameters: {
            comment: 'Test with "quotes" and & special chars',
            reason: 'Suspicious activity detected',
            'custom-field': 'value with spaces',
          },
        },
        [hostsIn('normal', AID), { status: 202, data: { resources: [{ id: AID }] } }]
      );
      expect(sent()[1].data).toEqual({
        ids: [AID],
        action_parameters: [
          { name: 'comment', value: 'Test with "quotes" and & special chars' },
          { name: 'reason', value: 'Suspicious activity detected' },
          { name: 'custom-field', value: 'value with spaces' },
        ],
      });
    });
  });

  describe('error message format (V1 CrowdstrikeError)', () => {
    const errorFor = async (reply: Reply) => {
      const { ctx } = makeCtx([], { fallback: reply });
      return falconRequest(ctx, {
        method: 'GET',
        path: '/x',
        retryServerErrors: false,
        scope: 'the Test scope',
      }).catch((e: Error) => e);
    };

    it('[C-v1-079] the status code and the message are both in the error text', async () => {
      const error = await errorFor(fail(401, 'Unauthorized access'));
      expect((error as Error).message).toMatch(/^Status code: 401\. Message: /);
      const forbidden = await errorFor(fail(403, 'Unauthorized access'));
      expect((forbidden as Error).message).toContain(
        'Status code: 403. Message: Unauthorized access'
      );
    });

    it('[C-v1-080] a message with complex content is kept whole', async () => {
      const error = await errorFor(fail(400, 'Invalid parameter: endpoint_ids must be an array'));
      expect((error as Error).message).toBe(
        'Status code: 400. Message: Invalid parameter: endpoint_ids must be an array'
      );
    });

    it('[C-v1-081] a body in an unexpected format is reported as an unknown API error', async () => {
      const error = await errorFor({ status: 500, data: 'Some unexpected error format' });
      expect((error as Error).message).toBe('Status code: 500. Message: Unknown API error');
    });

    it('[C-v1-082] an empty error body is reported as an unknown API error', async () => {
      const error = await errorFor({ status: 500, data: '' });
      expect((error as Error).message).toBe('Status code: 500. Message: Unknown API error');
    });

    it('[C-v1-083] a message that only looks like a status code is not parsed again', async () => {
      const error = await errorFor(fail(500, 'Status code: 404'));
      expect((error as Error).message).toBe('Status code: 500. Message: Status code: 404');
    });

    it('[C-v1-084] a malformed embedded status code is kept as message text', async () => {
      const error = await errorFor(fail(500, 'Status code: abc. Message: Invalid'));
      expect((error as Error).message).toBe(
        'Status code: 500. Message: Status code: abc. Message: Invalid'
      );
    });

    it('[C-v1-085] a differently formatted embedded status is kept as message text', async () => {
      const error = await errorFor(fail(500, 'HTTP Status: 403. Message: Forbidden'));
      expect((error as Error).message).toBe(
        'Status code: 500. Message: HTTP Status: 403. Message: Forbidden'
      );
    });
  });

  describe('RTR batch session', () => {
    const init = (ctx: ActionContext, hosts = [AID, AID2]) =>
      initBatchSession(ctx, hosts, { timeout: 30, scope: 'the Real time response scope' });

    it('[C-v1-086] a session is opened for exactly the hosts given and returns the batch id', async () => {
      const { ctx, sent } = makeCtx([rtrInit('mock-batch-id')]);
      const session = await init(ctx);
      expect(session.batchId).toBe('mock-batch-id');
      expect(sent()[0].url).toBe(`${BASE}/real-time-response/combined/batch-init-session/v1`);
      expect(sent()[0].method).toBe('POST');
      expect(sent()[0].data).toEqual({ host_ids: [AID, AID2], queue_offline: false });
    });

    it('[C-v1-087] one call opens one session for duplicate hosts; each call opens its own', async () => {
      // V1 differs: V1 reused a cached session across calls; V2 opens a session per call (TDD migration table).
      const first = makeCtx([rtrInit('b1'), rtrCommand()]);
      await runBatchCommand(first.ctx, 'read_only', { endpoint_ids: [AID, AID], command: 'ls' });
      expect(first.sent().filter((c) => c.url.includes('batch-init-session'))).toHaveLength(1);
      expect(first.sent()[0].data.host_ids).toEqual([AID]);

      const second = makeCtx([
        rtrInit('b1'),
        rtrCommand(),
        rtrSessionDeleted,
        rtrInit('b2'),
        rtrCommand(),
      ]);
      await runBatchCommand(second.ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      await runBatchCommand(second.ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      expect(second.sent().filter((c) => c.url.includes('batch-init-session'))).toHaveLength(2);
    });

    it('[C-v1-088] an API failure while opening the session is raised', async () => {
      const { ctx } = makeCtx([], { fallback: fail(400, 'Session initialization failed') });
      await expect(init(ctx)).rejects.toThrow('Session initialization failed');
    });

    it('[C-v1-089] a null batch_id is refused', async () => {
      const { ctx } = makeCtx([rtrInit(null)]);
      await expect(init(ctx)).rejects.toThrow(/Real Time Response session could not be opened/);
    });

    it('[C-v1-090] a missing batch_id is refused', async () => {
      const { ctx } = makeCtx([{ status: 201, data: {} }]);
      await expect(init(ctx)).rejects.toThrow(/Real Time Response session could not be opened/);
    });

    it('[C-v1-091] a non-string batch_id is refused', async () => {
      const { ctx } = makeCtx([rtrInit(12345)]);
      await expect(init(ctx)).rejects.toThrow(/Real Time Response session could not be opened/);
    });

    it('[C-v1-092] after a failed open, the next call opens a session normally', async () => {
      const { ctx } = makeCtx([fail(400, 'First attempt failed'), rtrInit('success-batch-id')]);
      await expect(init(ctx, [AID])).rejects.toThrow('First attempt failed');
      expect((await init(ctx, [AID])).batchId).toBe('success-batch-id');
    });

    it('[C-v1-093] a session older than 5 minutes is refreshed with its batch id before the command', async () => {
      const { ctx, request, sent } = makeCtx([]);
      request
        .mockImplementationOnce(async () => {
          armed = true;
          return { status: 201, headers: {}, data: rtrInit('test-batch-id').data };
        })
        .mockResolvedValueOnce({ status: 200, headers: {}, data: { batch_id: 'test-batch-id' } })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data });
      await runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      const urls = sent().map((c) => c.url.replace(`${BASE}/real-time-response/combined/`, ''));
      expect(urls).toEqual([
        'batch-init-session/v1',
        'batch-refresh-session/v1',
        'batch-command/v1',
        `${BASE}/real-time-response/entities/sessions/v1`,
      ]);
      expect(sent()[1].data).toEqual({ batch_id: 'test-batch-id' });
      expect(sent()[3]).toMatchObject({ method: 'DELETE', params: { session_id: 's1' } });
    });

    it('[C-v1-094] a failed refresh ends the call, and the next call opens a new session', async () => {
      const { ctx, request, sent } = makeCtx([]);
      request
        .mockImplementationOnce(async () => {
          armed = true;
          return { status: 201, headers: {}, data: rtrInit('test-batch-id').data };
        })
        .mockResolvedValueOnce({ status: 400, headers: {}, data: fail(400, 'Refresh failed').data })
        .mockResolvedValueOnce({ status: 204, headers: {}, data: null })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrInit('new-batch-id').data })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data });
      await expect(
        runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' })
      ).rejects.toThrow('Refresh failed');
      // V2 also closes the session the failed call opened, instead of leaving it to expire.
      expect(sent()[2]).toMatchObject({ method: 'DELETE', params: { session_id: 's1' } });
      const result = await runBatchCommand(ctx, 'read_only', {
        endpoint_ids: [AID],
        command: 'ls',
      });
      expect(result.batch_id).toBe('new-batch-id');
      expect(sent()[3].url).toContain('batch-init-session');
    });

    it('[C-v1-095] a refresh reply for another batch does not poison the next call', async () => {
      // V1 differs: V1 cleared its cached session; V2 keeps none between calls, so recovery is automatic.
      const { ctx, request, sent } = makeCtx([]);
      request
        .mockImplementationOnce(async () => {
          armed = true;
          return { status: 201, headers: {}, data: rtrInit('test-batch-id').data };
        })
        .mockResolvedValueOnce({ status: 200, headers: {}, data: { batch_id: 'wrong-batch-id' } })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data })
        .mockResolvedValueOnce({ status: 204, headers: {}, data: null })
        .mockResolvedValueOnce({
          status: 201,
          headers: {},
          data: rtrInit('recovery-batch-id').data,
        })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data });
      await runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      expect(sent()[2].data.batch_id).toBe('test-batch-id');
      const next = await runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      expect(next.batch_id).toBe('recovery-batch-id');
    });

    it('[C-v1-096] a session idle for 10 minutes is never reused: the next call opens a new one', async () => {
      // V1 differs: V1 dropped an idle cached session after 10 minutes; V2 opens one per call.
      const { ctx, sent } = makeCtx([
        rtrInit('timeout-batch-id'),
        rtrCommand(),
        rtrSessionDeleted,
        rtrInit('new-session-after-timeout'),
        rtrCommand(),
      ]);
      const first = await runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      now += 10 * 60_000;
      const second = await runBatchCommand(ctx, 'read_only', {
        endpoint_ids: [AID],
        command: 'ls',
      });
      expect([first.batch_id, second.batch_id]).toEqual([
        'timeout-batch-id',
        'new-session-after-timeout',
      ]);
      expect(sent().filter((c) => c.url.includes('batch-init-session'))).toHaveLength(2);
    });

    it('[C-v1-097] calls 9 minutes apart each get a fresh session and need no refresh', async () => {
      const { ctx, sent } = makeCtx([
        rtrInit('b1'),
        rtrCommand(),
        rtrSessionDeleted,
        rtrInit('b2'),
        rtrCommand(),
        rtrSessionDeleted,
        rtrInit('b3'),
        rtrCommand(),
      ]);
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        ids.push(
          (await runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' })).batch_id
        );
        now += 9 * 60_000;
      }
      expect(ids).toEqual(['b1', 'b2', 'b3']);
      expect(sent().filter((c) => c.url.includes('refresh'))).toHaveLength(0);
    });

    it('[C-v1-098] a full lifecycle: open, refresh at 5 minutes, command, then a new session on the next call', async () => {
      const { ctx, request, sent } = makeCtx([]);
      request
        .mockImplementationOnce(async () => {
          armed = true;
          return { status: 201, headers: {}, data: rtrInit('lifecycle-batch-id').data };
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          data: { batch_id: 'lifecycle-batch-id' },
        })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data })
        .mockResolvedValueOnce({ status: 204, headers: {}, data: null })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrInit('new-session-id').data })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data });
      await runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      expect(sent()[1].url).toContain('batch-refresh-session');
      expect(sent()[1].data).toEqual({ batch_id: 'lifecycle-batch-id' });
      now += 10 * 60_000;
      const next = await runBatchCommand(ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      expect(next.batch_id).toBe('new-session-id');
    });

    it('[C-v1-099] recovery after an open failure and after a refresh failure', async () => {
      const { ctx, request } = makeCtx([]);
      request
        .mockResolvedValueOnce({ status: 400, headers: {}, data: fail(400, 'Init failed').data })
        .mockResolvedValueOnce({
          status: 201,
          headers: {},
          data: rtrInit('recovered-session').data,
        })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data })
        .mockResolvedValueOnce({ status: 204, headers: {}, data: null })
        .mockImplementationOnce(async () => {
          armed = true;
          return { status: 201, headers: {}, data: rtrInit('x').data };
        })
        .mockResolvedValueOnce({ status: 400, headers: {}, data: fail(400, 'Refresh failed').data })
        .mockResolvedValueOnce({ status: 204, headers: {}, data: null })
        .mockResolvedValueOnce({
          status: 201,
          headers: {},
          data: rtrInit('after-refresh-failure').data,
        })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data });
      const args = { endpoint_ids: [AID], command: 'ls' };
      await expect(runBatchCommand(ctx, 'read_only', args)).rejects.toThrow('Init failed');
      expect((await runBatchCommand(ctx, 'read_only', args)).batch_id).toBe('recovered-session');
      await expect(runBatchCommand(ctx, 'read_only', args)).rejects.toThrow('Refresh failed');
      expect((await runBatchCommand(ctx, 'read_only', args)).batch_id).toBe(
        'after-refresh-failure'
      );
    });
  });

  describe('OAuth token (V1 token manager)', () => {
    const afterRejected = async () =>
      run('getAgentDetails', { ids: [AID] }, [
        fail(401, 'access denied, invalid bearer token'),
        { data: { access_token: 'new-token' } },
        { data: { resources: [{}] } },
      ]);

    it('[C-v1-100] a new token is requested from the Falcon token URL with the client id and secret', async () => {
      // V1 differs: V1 sent HTTP Basic; V2 sends client_secret_post, the Falcon-documented form.
      const { sent } = await afterRejected();
      const tokenCall = sent()[1];
      expect(tokenCall.method).toBe('POST');
      expect(tokenCall.url).toBe(TOKEN_URL);
      const form = new URLSearchParams(tokenCall.data);
      expect(form.get('grant_type')).toBe('client_credentials');
      expect(form.get('client_id')).toBe('test-client-id');
      expect(form.get('client_secret')).toBe('test-client-secret');
      expect(tokenCall.headers.Authorization).toBeUndefined();
    });

    it('[C-v1-101] a token that works is used as it is: no token request', async () => {
      const { sent } = await run('getAgentDetails', { ids: [AID] }, [
        { data: { resources: [{}] } },
      ]);
      expect(sent().map((c) => c.url)).toEqual([`${BASE}/devices/entities/devices/v2`]);
    });

    it('[C-v1-102] a token that Falcon refuses (expired) is replaced and the call repeated', async () => {
      const { sent } = await afterRejected();
      expect(sent().map((c) => c.url)).toEqual([
        `${BASE}/devices/entities/devices/v2`,
        TOKEN_URL,
        `${BASE}/devices/entities/devices/v2`,
      ]);
      expect(sent()[2].headers.Authorization).toBe('Bearer new-token');
    });

    it('[C-v1-103] the new-token request goes to the token URL from the connector secrets', async () => {
      const { sent } = await run('getAgentDetails', { ids: [AID] }, [
        fail(401, 'expired'),
        { data: { access_token: 'abc' } },
        { data: { resources: [{}] } },
      ]);
      expect(sent()[1].url).toBe(SECRETS.tokenUrl);
    });

    it('[C-v1-104] a second 401 after the new token fails at once, with no third request', async () => {
      const { ctx, request } = makeCtx([
        fail(401, 'expired'),
        { data: { access_token: 'different-token-here' } },
        fail(401, 'still expired'),
      ]);
      await expect(action('getAgentDetails').handler(ctx, { ids: [AID] })).rejects.toThrow(
        /Status code: 401\. Message: authentication failed/
      );
      expect(request).toHaveBeenCalledTimes(3);
    });
  });

  describe('configuration schema (V1 url becomes a Falcon cloud and an optional API URL)', () => {
    const schema = () => {
      if (!Crowdstrike2.schema) {
        throw new Error('no schema');
      }
      return Crowdstrike2.schema;
    };

    it('[C-v1-117] valid configs are accepted: a named cloud and a custom API URL', () => {
      expect(() => schema().parse({ region: 'us-1' })).not.toThrow();
      expect(() =>
        schema().parse({ region: 'custom', apiUrl: 'https://api.crowdstrike.com' })
      ).not.toThrow();
    });

    it('[C-v1-118] a custom cloud without an API URL is refused when a request is built', () => {
      // V1 differs: V1 required `url`; V2 picks the host from the cloud and only `custom` needs apiUrl.
      const { ctx } = makeCtx([], { config: { region: 'custom' } });
      expect(() => getBaseUrl(ctx)).toThrow(/no API URL is configured/);
    });

    it('[C-v1-119] unknown config properties never reach the stored config', () => {
      // V1 differs: V1 threw on unknown properties; V2 strips them (Zod object default).
      const parsed = schema().parse({ region: 'us-1', unknownProp: 'value' });
      expect(parsed).not.toHaveProperty('unknownProp');
    });

    it('[C-v1-120] an empty API URL is refused', () => {
      // V1 differs: V1 accepted ''; V2 requires a valid HTTPS URL.
      expect(schema().safeParse({ region: 'custom', apiUrl: '' }).success).toBe(false);
    });

    it('[C-v1-121] an undefined API URL on a custom cloud is refused when a request is built', () => {
      const { ctx } = makeCtx([], { config: { region: 'custom', apiUrl: undefined } });
      expect(() => getBaseUrl(ctx)).toThrow(/no API URL is configured/);
    });
  });

  describe('secrets schema (V1 clientId and clientSecret)', () => {
    const secrets = () =>
      OAuth.schema as unknown as { safeParse: (v: unknown) => { success: boolean } };

    it('[C-v1-122] a client id and secret with the token URL are accepted', () => {
      expect(
        secrets().safeParse({
          tokenUrl: TOKEN_URL,
          clientId: 'client-123',
          clientSecret: 'secret-456',
        }).success
      ).toBe(true);
    });

    it('[C-v1-123] a missing client id is refused', () => {
      expect(secrets().safeParse({ tokenUrl: TOKEN_URL, clientSecret: 'secret-456' }).success).toBe(
        false
      );
    });

    it('[C-v1-124] a missing client secret is refused', () => {
      expect(secrets().safeParse({ tokenUrl: TOKEN_URL, clientId: 'client-123' }).success).toBe(
        false
      );
    });

    it('[C-v1-125] an empty secrets object is refused', () => {
      expect(secrets().safeParse({}).success).toBe(false);
    });
  });

  describe('input schemas (V1 hostActions, getAgents and RTR init)', () => {
    it('[C-v1-126] containHost accepts device ids', () => {
      expect(action('containHost').input.safeParse({ ids: [AID, AID2] }).success).toBe(true);
    });

    it('[C-v1-127] liftContainment accepts device ids', () => {
      expect(action('liftContainment').input.safeParse({ ids: [AID] }).success).toBe(true);
    });

    it('[C-v1-128] optional action parameters are accepted; V1 alertIds and comment are dropped', () => {
      // V1 differs: alertIds and comment were never sent to Falcon and are not inputs in V2 (R-086).
      const parsed = action('containHost').input.parse({
        ids: [AID],
        actionParameters: { key: 'value' },
        alertIds: ['alert-1'],
        comment: 'Test comment',
      });
      expect(parsed).toEqual({ ids: [AID], actionParameters: { key: 'value' } });
    });

    it('[C-v1-129] there is no generic hostActions action, so an invalid command cannot be sent', () => {
      // V1 differs: V1 took command=contain|lift_containment; V2 has one action for each.
      expect(Crowdstrike2.actions.hostActions).toBeUndefined();
      expect(Crowdstrike2.actions.containHost).toBeDefined();
      expect(Crowdstrike2.actions.liftContainment).toBeDefined();
    });

    it('[C-v1-130] ids are required', () => {
      expect(action('containHost').input.safeParse({}).success).toBe(false);
    });

    it('[C-v1-131] an empty ids list is refused', () => {
      // V1 differs: V1 accepted []; Falcon needs at least one id.
      expect(action('containHost').input.safeParse({ ids: [] }).success).toBe(false);
    });

    it('[C-v1-132] undefined ids are refused', () => {
      expect(action('containHost').input.safeParse({ ids: undefined }).success).toBe(false);
    });

    it('[C-v1-133] getAgentDetails accepts an ids array', () => {
      expect(action('getAgentDetails').input.safeParse({ ids: [AID, AID2] }).success).toBe(true);
    });

    it('[C-v1-134] getAgentDetails requires ids', () => {
      expect(action('getAgentDetails').input.safeParse({}).success).toBe(false);
    });

    it('[C-v1-135] unknown properties of getAgentDetails are not forwarded', () => {
      // V1 differs: V1 threw on unknown properties; V2 strips them, so they never reach Falcon.
      const parsed = action('getAgentDetails').input.parse({ ids: [AID], unknownProp: 'value' });
      expect(parsed).toEqual({ ids: [AID] });
    });

    it('[C-v1-138] executeRTRCommand accepts endpoint_ids and a command', () => {
      expect(
        action('executeRTRCommand').input.safeParse({ endpoint_ids: [AID], command: 'ls' }).success
      ).toBe(true);
    });

    it('[C-v1-139] executeRTRCommand requires endpoint_ids', () => {
      expect(action('executeRTRCommand').input.safeParse({ command: 'ls' }).success).toBe(false);
    });

    it('[C-v1-140] executeRTRCommand accepts several endpoint ids', () => {
      expect(
        action('executeRTRCommand').input.safeParse({
          endpoint_ids: [AID, AID2, 'a'.repeat(32)],
          command: 'ps',
        }).success
      ).toBe(true);
    });
  });

  describe('V1 behaviour pins', () => {
    it('[C-v1-216] the token is not requested again while a request succeeds', async () => {
      const { sent } = await run('getAgentDetails', { ids: [AID] }, [
        { data: { resources: [{}] } },
      ]);
      expect(sent().filter((c) => c.url === TOKEN_URL)).toHaveLength(0);
    });

    it('[C-v1-217] a trailing slash in the configured URL does not produce a double slash', async () => {
      // V1 differs: V1 produced "https://api.crowdstrike.com//devices/..." (a pinned bug).
      const { sent } = await run(
        'getAgentOnlineStatus',
        { ids: [AID] },
        [{ data: { resources: [] } }],
        {
          config: { region: 'custom', apiUrl: 'https://api.crowdstrike.com/' },
          secrets: SECRETS,
        }
      );
      expect(sent()[0].url).toBe('https://api.crowdstrike.com/devices/entities/online-state/v1');
      expect(sent()[0].url).not.toContain('//devices');
    });

    it('[C-v1-218] parameter serializer encodes reserved characters and unicode', () => {
      // V1 differs: space becomes '+' (form encoding) instead of %20; reserved characters and unicode match V1.
      expect(serializeParams({ 'special&chars': 'a&b' })).toBe('special%26chars=a%26b');
      expect(serializeParams({ q: 'тест' })).toBe('q=%D1%82%D0%B5%D1%81%D1%82');
    });

    it('[C-v1-219] an unsupported RTR command is rejected and makes zero API calls', async () => {
      const { ctx, request } = makeCtx([]);
      await expect(
        action('executeRTRCommand').handler(ctx, {
          endpoint_ids: [AID],
          command: 'unsupported_command',
        })
      ).rejects.toThrow(/not allowed/);
      expect(request).not.toHaveBeenCalled();
    });

    it('[C-v1-220] an auth error (403) carries its message through host, status and RTR-library actions', async () => {
      for (const [name, input] of [
        ['getAgentDetails', { ids: [AID] }],
        ['containHost', { ids: [AID] }],
        ['getAgentOnlineStatus', { ids: [AID] }],
        ['getRTRCloudScripts', {}],
      ] as Array<[string, unknown]>) {
        const { ctx } = makeCtx([], { fallback: fail(403, 'Authentication failed') });
        await expect(action(name).handler(ctx, action(name).input.parse(input))).rejects.toThrow(
          /Status code: 403\. Message: Authentication failed/
        );
      }
    });

    it("[C-v1-221] RTR results keep Falcon's per-host map, and library scripts keep the vendor records", async () => {
      // V1 differs: V2 adds the normalised results, complete and batch_id next to the vendor map (output_refs).
      const { result } = await run('executeRTRCommand', { endpoint_ids: [AID], command: 'ls' }, [
        rtrInit(),
        rtrCommand(),
      ]);
      const batch = result as {
        resources: Record<string, unknown>;
        errors: unknown[];
        results: unknown[];
      };
      expect(batch.resources[AID]).toMatchObject({ complete: true, stdout: 'out', task_id: 't1' });
      expect(batch.errors).toEqual([]);
      expect(batch.results).toHaveLength(1);
      const scripts = await run('getRTRCloudScripts', {}, [
        { data: { resources: ['s1'] } },
        { data: { resources: [{ id: 's1' }] } },
      ]);
      expect((scripts.result as { resources: unknown[] }).resources).toEqual([{ id: 's1' }]);
    });

    it('[C-v1-222] every RTR action is registered; V2 has no experimental RTR switch', () => {
      for (const name of [
        'executeRTRCommand',
        'batchActiveResponderExecuteRTR',
        'batchAdminExecuteRTR',
        'getRTRCloudScripts',
        'getRTRCommandStatus',
      ]) {
        expect(Crowdstrike2.actions[name]).toBeDefined();
      }
    });

    it('[C-v1-223] gaps V1 left: 401 retry, network error causes, unknown API error, cloud scripts query', async () => {
      const retried = await run('getAgentDetails', { ids: [AID] }, [
        fail(401, 'x'),
        { data: { access_token: 't' } },
        { data: { resources: [{}] } },
      ]);
      expect(retried.request).toHaveBeenCalledTimes(3);

      for (const code of ['ENOTFOUND', 'ECONNREFUSED']) {
        const { ctx, request } = makeCtx([]);
        request.mockRejectedValue(
          Object.assign(new Error(`getaddrinfo ${code}`), { isAxiosError: true, code })
        );
        await expect(action('getAgentDetails').handler(ctx, { ids: [AID] })).rejects.toThrow(
          new RegExp(`Could not reach api\\.crowdstrike\\.com: ${code}`)
        );
      }
      const unknown = makeCtx([{ status: 400, data: {} }]);
      await expect(action('getAgentDetails').handler(unknown.ctx, { ids: [AID] })).rejects.toThrow(
        'Status code: 400. Message: Unknown API error'
      );

      const scripts = await run(
        'getRTRCloudScripts',
        { filter: "name:'collect*'", limit: 5, offset: 10, sort: 'name.asc' },
        [{ data: { resources: [] } }]
      );
      expect(scripts.sent()[0].params).toEqual({
        filter: "name:'collect*'",
        limit: 5,
        offset: '10',
        sort: 'name.asc',
      });
    });

    it('[C-v1-243] an error message with several colons is preserved after "Message: "', async () => {
      const { ctx } = makeCtx([], { fallback: fail(403, 'Forbidden: scope: hosts: read') });
      await expect(action('getAgentDetails').handler(ctx, { ids: [AID] })).rejects.toThrow(
        /Status code: 403\. Message: Forbidden: scope: hosts: read;/
      );
    });

    it('[C-v1-252] after a refresh failure the next call opens a new session; refresh waits for 5 minutes', async () => {
      const young = makeCtx([rtrInit('b'), rtrCommand()]);
      await runBatchCommand(young.ctx, 'read_only', { endpoint_ids: [AID], command: 'ls' });
      expect(young.sent().some((c) => c.url.includes('refresh'))).toBe(false);

      const { ctx, request, sent } = makeCtx([]);
      request
        .mockImplementationOnce(async () => {
          armed = true;
          return { status: 201, headers: {}, data: rtrInit('old').data };
        })
        .mockResolvedValueOnce({ status: 400, headers: {}, data: fail(400, 'Refresh failed').data })
        .mockResolvedValueOnce({ status: 204, headers: {}, data: null })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrInit('fresh').data })
        .mockResolvedValueOnce({ status: 201, headers: {}, data: rtrCommand().data });
      const args = { endpoint_ids: [AID], command: 'ls' };
      await expect(runBatchCommand(ctx, 'read_only', args)).rejects.toThrow('Refresh failed');
      await runBatchCommand(ctx, 'read_only', args);
      expect(sent().filter((c) => c.url.includes('batch-init-session'))).toHaveLength(2);
    });

    it('[C-v1-259] the token request carries client credentials; a replaced token is used for the repeat', async () => {
      // V1 differs: client_secret_post in the form body instead of HTTP Basic.
      const { sent } = await run('getAgentDetails', { ids: [AID] }, [
        fail(401, 'expired'),
        { data: { access_token: 'replacement' } },
        { data: { resources: [{}] } },
      ]);
      expect(new URLSearchParams(sent()[1].data).get('client_id')).toBe('test-client-id');
      expect(sent()[2].headers.Authorization).toBe('Bearer replacement');
      expect(Crowdstrike2.auth?.types[0]).toMatchObject({
        defaults: { tokenEndpointAuthMethod: 'client_secret_post' },
      });
    });

    it('[C-v1-260] gaps V1 left: a failed token fetch is an auth error, with one token request', async () => {
      const { ctx, request } = makeCtx([
        fail(401, 'expired'),
        { status: 401, data: { errors: [] } },
      ]);
      await expect(action('getAgentDetails').handler(ctx, { ids: [AID] })).rejects.toThrow(
        /authentication failed/
      );
      expect(request.mock.calls.filter(([c]) => c.url === TOKEN_URL)).toHaveLength(1);
    });

    it('[C-v1-277] schema pins: empty ids are refused, unknown properties are dropped, extra V1 fields are not forwarded', () => {
      // V1 differs: V1 accepted empty ids and an empty url, and threw on unknown properties (see C-v1-120, 131, 135).
      expect(action('containHost').input.safeParse({ ids: [] }).success).toBe(false);
      expect(
        action('containHost').input.parse({
          ids: [AID],
          alertIds: ['a'],
          comment: 'c',
          actionParameters: { k: 'v' },
        })
      ).toEqual({ ids: [AID], actionParameters: { k: 'v' } });
      expect(action('getAgentDetails').input.parse({ ids: [AID], x: 1 })).toEqual({ ids: [AID] });
    });
  });
});
