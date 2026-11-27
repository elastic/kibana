/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { ApiKeyHeaderAuth } from '../../auth_types/api_key_header';
import { SentinelOne } from './sentinelone';
import {
  API,
  AUTH,
  CONSOLE,
  ctx,
  listBody,
  request,
  resetMocksAroundEachTest,
  run,
} from './test_helpers';

resetMocksAroundEachTest();

/**
 * V1 parity: every test of the V1 stack connector (x-pack stack_connectors sentinelone.test.ts) carried to V2.
 * Same input, same expected result, in V2's action names and schemas. The one documented change (G1) is the credential
 * placement: V1 sent it as the APIToken query parameter, V2 sends Authorization: ApiToken <token> (AUTH in test_helpers.ts).
 */
describe('V1 parity', () => {
  const parses = (name: string, input: unknown) => SentinelOne.actions[name].input.parse(input);
  const NEW_AGENT = '225494730938493804';
  const fileOk = () => ({ status: 200, data: { data: { success: true }, errors: null } });

  it('fetchAgentFiles errors if no agent id is provided', async () => {
    await expect(async () =>
      run('fetchAgentFiles', { agentId: '', files: ['/tmp/one'], zipPassCode: 'passwordMin10' })
    ).rejects.toThrow(/agentId/);
  });

  it('fetchAgentFiles calls the fetch-files API with the expected data', async () => {
    request.mockResolvedValue(fileOk());
    const response = await run('fetchAgentFiles', {
      agentId: NEW_AGENT,
      files: ['/tmp/one'],
      zipPassCode: 'foo-password-1',
    });
    expect(response).toEqual(expect.objectContaining({ data: { success: true } }));
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: `${API}/agents/${NEW_AGENT}/actions/fetch-files`,
        method: 'POST',
        data: { data: { password: 'foo-password-1', files: ['/tmp/one'] } },
        headers: AUTH,
      })
    );
  });

  it('downloadAgentFile errors if called with an invalid agent id', async () => {
    await expect(async () =>
      run('downloadAgentFile', { agentId: '', activityId: '5' })
    ).rejects.toThrow(/agentId/);
  });

  it('downloadAgentFile calls the API with the expected url and returns the file', async () => {
    request.mockResolvedValue({
      status: 200,
      data: new TextEncoder().encode('file-body').buffer,
      headers: { 'content-type': 'application/zip' },
    });
    const result = await run('downloadAgentFile', { agentId: NEW_AGENT, activityId: '77' });
    expect(request.mock.calls[0][0].url).toBe(`${API}/agents/${NEW_AGENT}/uploads/77`);
    expect(result).toEqual(expect.objectContaining({ sizeBytes: 9 }));
  });

  it('getActivities calls the activities API with no query params', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getActivities', {});
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/activities`,
        params: {},
        headers: AUTH,
      })
    );
  });

  it('getActivities calls the activities API with the provided query params', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getActivities', { ids: 'one, two', limit: 20, cursor: 'at-position-1' } as never);
    expect(request.mock.calls[0][0].params).toEqual({
      ids: 'one, two',
      limit: 20,
      cursor: 'at-position-1',
    });
  });

  it('downloadRemoteScriptResults calls the API to retrieve the task results', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: { data: { data: { downloadLinks: [] } } },
    });
    await run('downloadRemoteScriptResults', { taskId: 'task-123' }).catch(() => undefined);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${API}/remote-scripts/fetch-files`,
        data: { data: { taskIds: ['task-123'] } },
      })
    );
  });

  it('downloadRemoteScriptResults errors if the task has no download url', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { data: { downloadLinks: [] } } } });
    await expect(run('downloadRemoteScriptResults', { taskId: 'task-123' })).rejects.toThrow(
      'Download URL for script results of task id [task-123] not found'
    );
  });

  it('downloadRemoteScriptResults returns the file behind the link', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            data: {
              downloadLinks: [
                { taskId: 'task-123', fileName: 'r.zip', downloadUrl: `${CONSOLE}/f/r.zip` },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: new TextEncoder().encode('results').buffer,
        headers: {},
      });
    await expect(run('downloadRemoteScriptResults', { taskId: 'task-123' })).resolves.toEqual(
      expect.objectContaining({ fileName: 'r.zip', taskId: 'task-123', sizeBytes: 7 })
    );
  });

  it('getRemoteScripts passes the query parameters to the API', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getRemoteScripts', {
      osTypes: ['windows'],
      limit: 123,
      cursor: 'at-position-1',
      groupIds: ['abc'],
      ids: ['987'],
      isAvailableForArs: true,
      query: 'match something',
      scriptType: ['action'],
      siteIds: ['site-aaa'],
      additionalFilters: { sortBy: 'scriptName', skip: 10, skipCount: true, sortOrder: 'asc' },
    } as never).catch((e) => {
      throw e;
    });
    const sent = request.mock.calls[0][0];
    expect(sent.url).toBe(`${API}/remote-scripts`);
    expect(sent.params).toEqual(
      expect.objectContaining({
        osTypes: 'windows',
        limit: 123,
        cursor: 'at-position-1',
        groupIds: 'abc',
        ids: '987',
        isAvailableForArs: true,
        query: 'match something',
        scriptType: 'action',
        siteIds: 'site-aaa',
        sortBy: 'scriptName',
        skip: 10,
        skipCount: true,
        sortOrder: 'asc',
      })
    );
  });

  // V1 config and secrets schemas
  const configSchema = () => SentinelOne.schema as unknown as { parse: (v: unknown) => unknown };
  it('accepts a config with the tenant url', () => {
    expect(() => configSchema().parse({ url: 'https://api.sentinelone.com' })).not.toThrow();
  });
  it('rejects a config without the url', () => {
    expect(() => configSchema().parse({})).toThrow();
  });
  it('rejects a config with unknown properties', () => {
    expect(() =>
      configSchema().parse({ url: 'https://api.sentinelone.com', unknownProp: 'value' })
    ).toThrow();
  });
  it('stores the API token as an api_key_header secret in the token field', () => {
    const t = SentinelOne.auth?.types?.[0] as { type: string; defaults?: { headerField?: string } };
    expect(t.type).toBe('api_key_header');
    expect(t.defaults?.headerField).toBe('token');
  });
  it('the connectivity test fails without the API token before any request', async () => {
    const test = SentinelOne.test as unknown as {
      handler: (c: ActionContext) => Promise<{ ok: boolean }>;
    };
    await expect(test.handler({ ...ctx, secrets: {} } as unknown as ActionContext)).rejects.toThrow(
      'SentinelOne connector is missing the API token.'
    );
    expect(request).not.toHaveBeenCalled();
  });
  // Intended change: V1 rejected unknown secret properties; the V2 secrets schema comes from the shared
  // api_key_header auth type, which requires the token and drops unknown properties instead.
  it('the secrets schema requires a non-empty token and drops unknown properties', () => {
    const secretsSchema = ApiKeyHeaderAuth.normalizeSchema?.({ headerField: 'token' }) as {
      parse: (v: unknown) => unknown;
    };
    expect(() => secretsSchema.parse({})).toThrow();
    expect(() => secretsSchema.parse({ token: '' })).toThrow();
    expect(secretsSchema.parse({ token: 'x', unknownProp: 'value' })).toEqual({ token: 'x' });
  });

  it('getRemoteScripts accepts an empty input', () => {
    expect(() => parses('getRemoteScripts', {})).not.toThrow();
  });
  it('getRemoteScripts accepts its query, OS type, script type and limit filters', () => {
    expect(() =>
      parses('getRemoteScripts', {
        query: 'script-name',
        osTypes: ['windows', 'linux'],
        scriptType: ['action'],
        limit: 50,
      })
    ).not.toThrow();
  });
  // Intended change: V1 defaulted limit to null and axios dropped it, so neither V1 nor V2 sends a limit
  // when none is given (SentinelOne applies its default of 10); V2 leaves it undefined instead of null.
  it('getRemoteScripts has no default limit (V1 returned null, V2 leaves it unset)', () => {
    expect(parses('getRemoteScripts', {}).limit).toBeUndefined();
  });
  it('getRemoteScripts accepts the limit bounds 1 and 1000', () => {
    expect(() => parses('getRemoteScripts', { limit: 1 })).not.toThrow();
    expect(() => parses('getRemoteScripts', { limit: 1000 })).not.toThrow();
  });
  it('getRemoteScripts throws on a limit above the maximum', () => {
    expect(() => parses('getRemoteScripts', { limit: 1001 })).toThrow();
  });
  it('getRemoteScripts throws on a limit below the minimum', () => {
    expect(() => parses('getRemoteScripts', { limit: 0 })).toThrow();
  });
  it('getRemoteScripts coerces the limit to a number', () => {
    expect(parses('getRemoteScripts', { limit: '50' }).limit).toBe(50);
  });

  const fetchOk = {
    agentId: 'agent-123',
    zipPassCode: 'passwordMin10',
    files: ['/path/to/file.txt'],
  };
  it('fetchAgentFiles accepts the required fields', () => {
    expect(() => parses('fetchAgentFiles', fetchOk)).not.toThrow();
  });
  it('fetchAgentFiles throws when the agentId is missing', () => {
    expect(() => parses('fetchAgentFiles', { ...fetchOk, agentId: undefined })).toThrow();
  });
  it('fetchAgentFiles throws on an empty agentId', () => {
    expect(() => parses('fetchAgentFiles', { ...fetchOk, agentId: '' })).toThrow();
  });
  it('fetchAgentFiles throws when the zipPassCode is too short', () => {
    expect(() => parses('fetchAgentFiles', { ...fetchOk, zipPassCode: 'short' })).toThrow();
  });
  it('fetchAgentFiles throws when the files array contains an empty string', () => {
    expect(() => parses('fetchAgentFiles', { ...fetchOk, files: [''] })).toThrow();
  });
  it('downloadAgentFile accepts the required fields', () => {
    expect(() =>
      parses('downloadAgentFile', { agentId: 'agent-123', activityId: 'activity-456' })
    ).not.toThrow();
  });
  it('downloadAgentFile throws on an empty agentId', () => {
    expect(() =>
      parses('downloadAgentFile', { agentId: '', activityId: 'activity-456' })
    ).toThrow();
  });
  it('downloadAgentFile throws on an empty activityId', () => {
    expect(() => parses('downloadAgentFile', { agentId: 'agent-123', activityId: '' })).toThrow();
  });

  it('getActivities accepts an empty input', () => {
    expect(() => parses('getActivities', {})).not.toThrow();
  });
  it('getActivities accepts an undefined input', () => {
    expect(() => parses('getActivities', undefined)).not.toThrow();
  });
  it('getActivities accepts its filters', () => {
    expect(() =>
      parses('getActivities', {
        accountIds: ['account-123'],
        activityTypes: [1, 2, 3],
        agentIds: ['agent-123', 'agent-456'],
        limit: 100,
      })
    ).not.toThrow();
  });
  it('getActivities coerces the limit to a number', () => {
    expect(parses('getActivities', { limit: '50' })?.limit).toBe(50);
  });

  it('executeScript accepts the required fields', () => {
    expect(() =>
      parses('executeScript', {
        agentIds: [NEW_AGENT],
        scriptId: '1164327801004752901',
        taskDescription: 'soar-test',
      })
    ).not.toThrow();
  });
  it('executeScript accepts all script options', () => {
    expect(() =>
      parses('executeScript', {
        agentUuids: ['3f6c1d2e-8b7a-4e5f-9a10-0b1c2d3e4f50'],
        scriptId: '1164327801004752901',
        taskDescription: 'soar-test',
        inputParams: '-Verbose',
        outputDirectory: '/output',
        outputDestination: 'SentinelCloud',
        scriptRuntimeTimeoutSeconds: 300,
      })
    ).not.toThrow();
  });
  it('executeScript accepts the SentinelCloud, Local and None output destinations', () => {
    for (const dest of ['Local', 'None', 'SentinelCloud']) {
      expect(() =>
        parses('executeScript', {
          agentIds: [NEW_AGENT],
          scriptId: '1164327801004752901',
          taskDescription: 'soar-test',
          outputDestination: dest,
        })
      ).not.toThrow();
    }
  });
  it('executeScript throws on an invalid outputDestination', () => {
    expect(() =>
      parses('executeScript', {
        agentIds: [NEW_AGENT],
        scriptId: '1164327801004752901',
        taskDescription: 'soar-test',
        outputDestination: 'Invalid',
      })
    ).toThrow();
  });
  it('executeScript coerces scriptRuntimeTimeoutSeconds to a number', () => {
    expect(
      parses('executeScript', {
        agentIds: [NEW_AGENT],
        scriptId: '1164327801004752901',
        taskDescription: 'soar-test',
        scriptRuntimeTimeoutSeconds: '300',
      }).scriptRuntimeTimeoutSeconds
    ).toBe(300);
  });

  it('getRemoteScriptResults accepts taskIds', () => {
    expect(() => parses('getRemoteScriptResults', { taskIds: ['task-1', 'task-2'] })).not.toThrow();
  });
  it('getRemoteScriptResults throws when taskIds is missing', () => {
    expect(() => parses('getRemoteScriptResults', {})).toThrow();
  });
  it('downloadRemoteScriptResults accepts a taskId', () => {
    expect(() => parses('downloadRemoteScriptResults', { taskId: 'task-123' })).not.toThrow();
  });
  it('downloadRemoteScriptResults throws on an empty taskId', () => {
    expect(() => parses('downloadRemoteScriptResults', { taskId: '' })).toThrow();
  });
  it('getRemoteScriptStatus accepts a parentTaskId', () => {
    expect(() =>
      parses('getRemoteScriptStatus', { parentTaskId: 'parent-task-123' })
    ).not.toThrow();
  });
  it('getRemoteScriptStatus throws when the parentTaskId is missing', () => {
    expect(() => parses('getRemoteScriptStatus', {})).toThrow();
  });

  // Intended change R-099 (G1 decision): V1 accepted {} or host filters and acted on the first match; V2 requires
  // explicit agentIds, because SentinelOne applies an empty or broad filter to every matching agent.
  it('isolateHost rejects an input without agentIds, which V1 accepted', () => {
    expect(() => parses('isolateHost', {})).toThrow();
  });
  it('isolateHost rejects V1 host filters without agentIds and accepts explicit agentIds', () => {
    expect(() =>
      parses('isolateHost', { ids: 'agent-123', siteIds: 'site-456', groupIds: 'group-789' })
    ).toThrow();
    expect(() => parses('isolateHost', { agentIds: ['agent-123'] })).not.toThrow();
  });
  it('declares the isolateHost action', () => {
    expect(SentinelOne.actions.isolateHost).toBeDefined();
  });
  it('declares the releaseHost action', () => {
    expect(SentinelOne.actions.releaseHost).toBeDefined();
  });
  it('declares the executeScript action', () => {
    expect(SentinelOne.actions.executeScript).toBeDefined();
  });
  it('does not declare an unknown action name', () => {
    expect(SentinelOne.actions.invalidAction).toBeUndefined();
  });

  it('getAgents without filters sends the ApiToken header and no query parameters', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getAgents', {});
    const sent = request.mock.calls[0][0];
    expect(sent.headers).toEqual(AUTH);
    expect(sent.params).toEqual({});
  });
  it("getActivities passes ids 'one, two' (comma then space) unchanged", async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getActivities', { ids: 'one, two' } as never);
    expect(request.mock.calls[0][0].params.ids).toBe('one, two');
  });
});
