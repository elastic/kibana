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
import { awaitDetonation, submitToSandbox, uploadSample } from './sandbox';

const makeCtx = (replies: Array<{ status?: number; data?: unknown }>) => {
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
  return { ctx, request };
};

describe('CrowdStrike Falcon sandbox', () => {
  let clock = 0;
  beforeEach(() => {
    clock = 0;
    jest.spyOn(timing, 'now').mockImplementation(() => clock);
    jest.spyOn(timing, 'sleep').mockImplementation(async (ms: number) => {
      clock += ms;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns the submission id and state when the report is not ready in time', async () => {
    const running = { data: { resources: [{ id: 'sub-1', state: 'running' }] } };
    const { ctx, request } = makeCtx([running, running, running, running]);
    const result = await awaitDetonation(ctx, 'sub-1', 20, 'Sandbox: Write');
    expect(result).toEqual({
      submission_id: 'sub-1',
      state: 'running',
      complete: false,
      sha256: undefined,
    });
    expect(request).toHaveBeenCalledTimes(3);
    expect(
      request.mock.calls.every(([c]) => c.url.endsWith('/falconx/entities/submissions/v1'))
    ).toBe(true);
  });

  it('reports an analysis that ended in error as complete without a verdict', async () => {
    const { ctx, request } = makeCtx([
      { data: { resources: [{ id: 'sub-1', state: 'error', sandbox: [{ sha256: 'ab' }] }] } },
    ]);
    expect(await awaitDetonation(ctx, 'sub-1', 60, 's')).toEqual({
      submission_id: 'sub-1',
      state: 'error',
      complete: true,
      sha256: 'ab',
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('fails with Falcon’s message when a submission returns no id', async () => {
    const { ctx } = makeCtx([
      { data: { resources: [], errors: [{ code: 400, message: 'quota exceeded' }] } },
    ]);
    await expect(submitToSandbox(ctx, { url: 'https://a.example' }, {}, 's')).rejects.toThrow(
      'Falcon Sandbox did not accept the submission: quota exceeded'
    );
  });

  it('sends the action script and environment and does not retry a 5xx submission', async () => {
    const { ctx, request } = makeCtx([{ status: 503, data: { errors: [{ message: 'down' }] } }]);
    await expect(
      submitToSandbox(ctx, { sha256: 'ab' }, { environment_id: 140, action_script: 'default' }, 's')
    ).rejects.toThrow('Status code: 503');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0].data).toEqual({
      sandbox: [{ sha256: 'ab', environment_id: 140, action_script: 'default' }],
    });
  });

  it('uploads a sample as confidential multipart and returns its sha256', async () => {
    const { ctx, request } = makeCtx([{ data: { resources: [{ sha256: 'cd' }] } }]);
    expect(await uploadSample(ctx, Buffer.from('MZ').toString('base64'), 'a.exe', 's')).toBe('cd');
    const form = request.mock.calls[0][0].data as FormData;
    expect(request.mock.calls[0][0].url).toBe(
      'https://api.crowdstrike.com/samples/entities/samples/v3'
    );
    expect(form.get('file_name')).toBe('a.exe');
    expect(form.get('is_confidential')).toBe('true');
    expect(await (form.get('sample') as File).text()).toBe('MZ');
  });
});
