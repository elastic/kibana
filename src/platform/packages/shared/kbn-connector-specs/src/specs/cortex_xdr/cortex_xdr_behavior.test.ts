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
import { CortexXdr } from './cortex_xdr';

const API_URL = 'https://api-tenant.xdr.us.paloaltonetworks.com';
const BASE = `${API_URL}/public_api/v1`;
const EP = 'aeec6a2cc92e46fab3b6f621722e9916';
const SHA = 'b'.repeat(64);

const ok = (data: unknown, status = 200) => ({ status, data, headers: {} });
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
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const runAction = (ctx: ActionContext, name: string, input: unknown) => {
  const action = CortexXdr.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

const actionReply = { reply: { action_id: 77, status: true, endpoints_count: 1 } };

describe('Cortex XDR connector state-changing behaviour', () => {
  beforeEach(() => jest.spyOn(timing, 'sleep').mockResolvedValue());
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['scanEndpoint', { endpointIds: [EP] }, actionReply, '/endpoints/scan'],
    ['cancelScan', { endpointIds: [EP] }, actionReply, '/endpoints/abort_scan'],
    ['restoreFile', { fileHash: SHA }, actionReply, '/endpoints/restore'],
    [
      'quarantineFile',
      { endpointIds: [EP], filePath: 'C:\\x.exe', fileHash: SHA },
      actionReply,
      '/endpoints/quarantine',
    ],
    [
      'retrieveFile',
      { endpointIds: [EP], windowsPaths: ['C:\\x.txt'] },
      actionReply,
      '/endpoints/file_retrieval',
    ],
    ['runScript', { scriptUid: 'abc123', endpointIds: [EP] }, actionReply, '/scripts/run_script'],
    ['addEndpointTag', { endpointIds: [EP], tag: 'triage' }, true, '/tags/agents/assign'],
    ['removeEndpointTag', { endpointIds: [EP], tag: 'triage' }, true, '/tags/agents/remove'],
    ['blocklistFiles', { hashList: [SHA] }, true, '/hash_exceptions/blocklist'],
    ['allowlistFiles', { hashList: [SHA] }, true, '/hash_exceptions/allowlist'],
    [
      'insertIndicators',
      { indicators: [{ indicator: SHA, type: 'HASH' }] },
      { reply: { added_objects: [], updated_objects: [{ rule_id: 5 }], errors: [] } },
      '/indicators/insert',
    ],
    ['updateCase', { caseId: 31, notes: 'checked' }, '', '/case/update/31'],
    ['updateIssue', { issueIds: [9], status: 'In Progress' }, '', '/issue/9'],
  ])(
    '%s called twice sends the request again and returns the same result',
    async (name, input, data, path) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue(ok(data, data === '' ? 204 : 200));
      const first = await runAction(ctx, name, input);
      const second = await runAction(ctx, name, input);
      expect(second).toEqual(first);
      expect(request.mock.calls.map(([config]) => config.url)).toEqual([
        `${BASE}${path}`,
        `${BASE}${path}`,
      ]);
    }
  );

  it('updateIssue fails with "found none" when every issue id is unknown', async () => {
    const { ctx, request } = createContext();
    request.mockRejectedValue(httpError(404));
    await expect(
      runAction(ctx, 'updateIssue', { issueIds: [7, 8], status: 'In Progress' })
    ).rejects.toThrow('Cortex XDR found none of the issue ids: 7, 8.');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('updateIssue fails when a partial error leaves no issue updated', async () => {
    const { ctx, request } = createContext();
    request
      .mockRejectedValueOnce(httpError(404))
      .mockRejectedValueOnce(httpError(500, { reply: { err_msg: 'Internal error' } }));
    await expect(
      runAction(ctx, 'updateIssue', { issueIds: [7, 8], status: 'In Progress' })
    ).rejects.toThrow(
      /updated none of the issues: 7: No Cortex XDR issue with id 7; 8: .*Internal error/
    );
  });

  it('insertIndicators returns per-item errors next to the added objects (partial)', async () => {
    const { ctx, request } = createContext();
    const body = {
      reply: {
        added_objects: [{ rule_id: 1 }],
        updated_objects: [],
        errors: [{ indicator: 'bad', error: 'invalid type' }],
      },
    };
    request.mockResolvedValueOnce(ok(body));
    await expect(
      runAction(ctx, 'insertIndicators', {
        indicators: [
          { indicator: SHA, type: 'HASH' },
          { indicator: 'bad', type: 'IP' },
        ],
      })
    ).resolves.toEqual(body.reply);
  });

  it('insertIndicators fails when the partial errors leave nothing inserted', async () => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(
      ok({ reply: { added_objects: [], updated_objects: [], errors: [{ error: 'invalid' }] } })
    );
    await expect(
      runAction(ctx, 'insertIndicators', { indicators: [{ indicator: 'x', type: 'IP' }] })
    ).rejects.toThrow('Cortex XDR inserted none of the indicators');
  });
});
