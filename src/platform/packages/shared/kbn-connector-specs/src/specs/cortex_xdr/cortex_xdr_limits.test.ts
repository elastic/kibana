/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { CortexXdr } from './cortex_xdr';
import { timing } from './client';

const API_URL = 'https://api-tenant.xdr.us.paloaltonetworks.com';

const ok = (data: unknown, status = 200) => ({ status, data, headers: {} });

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

const accepts = (action: string, input: unknown) =>
  CortexXdr.actions[action].input.safeParse(input).success;

const parseConfig = (apiUrl: string) =>
  (CortexXdr.schema as unknown as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
    apiUrl,
  }).success;

describe('Cortex XDR documented input limits: accepted at the limit, refused one beyond', () => {
  it.each([
    [
      'isolateEndpoint',
      'endpoint id length',
      (n: number) => ({ endpointIds: ['e'.repeat(n)] }),
      128,
    ],
    [
      'getDeviceControlViolations',
      'hostnames count',
      (n: number) => ({ hostnames: Array.from({ length: n }, (_, i) => `host-${i}`) }),
      100,
    ],
    [
      'updateCase',
      'resolveReason length',
      (n: number) => ({
        caseId: 31,
        status: 'Resolved',
        resolveReason: 'r'.repeat(n),
      }),
      128,
    ],
  ])('%s: %s at its limit', (action, _what, build, limit) => {
    expect(accepts(action, build(limit))).toBe(true);
    expect(accepts(action, build(limit + 1))).toBe(false);
  });

  it('refuses an empty endpoint id and an empty resolveReason (lower bound)', () => {
    expect(accepts('isolateEndpoint', { endpointIds: [''] })).toBe(false);
    expect(accepts('updateCase', { caseId: 31, status: 'Resolved', resolveReason: '' })).toBe(
      false
    );
  });

  it('the API URL is accepted at 2048 characters and refused beyond', () => {
    const urlOf = (length: number) => {
      const prefix = 'https://';
      const suffix = '.xdr.us.paloaltonetworks.com';
      const labels: string[] = [];
      let remaining = length - prefix.length - suffix.length;
      while (remaining > 0) {
        const label = Math.min(remaining, 63);
        labels.push('a'.repeat(label));
        remaining -= label + 1;
      }
      return `${prefix}${labels.join('.')}${suffix}`;
    };
    const exact = urlOf(2048);
    const over = urlOf(2049);
    expect(exact.length).toBeLessThanOrEqual(2048);
    expect(over.length).toBeGreaterThan(2048);
    expect(parseConfig(exact)).toBe(true);
    expect(parseConfig(over)).toBe(false);
  });
});

describe('Cortex XDR value assertions behind the shared helpers', () => {
  afterEach(() => jest.restoreAllMocks());

  it('a tag change answered with no body text says the response was not true', async () => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(ok(''));
    await expect(
      runAction(ctx, 'addEndpointTag', { endpointIds: ['ep1'], tag: 'triage' })
    ).rejects.toThrow('Cortex XDR did not confirm the change (the response was not true)');
  });

  it.each([
    [true, true],
    [false, false],
  ])('getIndicators sends extended_view %s as given', async (extendedView, expected) => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(ok({ objects_count: 0, objects_type: 'IOC', objects: [] }));
    await runAction(ctx, 'getIndicators', { extendedView });
    expect(request.mock.calls[0][0].data.request_data.extended_view).toBe(expected);
  });

  it('getIndicators leaves extended_view out when it is not given', async () => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(ok({ objects_count: 0, objects_type: 'IOC', objects: [] }));
    await runAction(ctx, 'getIndicators', {});
    expect(request.mock.calls[0][0].data.request_data).not.toHaveProperty('extended_view');
  });

  it('getIssues documents and applies the default includeEvidences false', () => {
    const schema = CortexXdr.actions.getIssues.input;
    expect(schema.parse({}).includeEvidences).toBe(false);
    expect(JSON.stringify(schema.toJSONSchema?.() ?? {})).toContain(
      'Include the evidence details of each issue. Defaults to false.'
    );
  });

  it('an endpoint lookup that ran out of time is a budget error, not a too-large error', async () => {
    let clock = 0;
    jest.spyOn(timing, 'now').mockImplementation(() => clock);
    jest.spyOn(timing, 'sleep').mockResolvedValue();
    const { ctx, request } = createContext();
    request.mockImplementationOnce(async () => {
      clock += 99_500;
      return ok({
        reply: {
          total_count: 150,
          endpoints: Array.from({ length: 100 }, (_, i) => ({ endpoint_id: `ep${i}` })),
        },
      });
    });
    const endpointIds = Array.from({ length: 150 }, (_, i) => `ep${i}`);
    await expect(runAction(ctx, 'isolateEndpoint', { endpointIds })).rejects.toMatchObject({
      name: 'CortexXdrError',
      tooLarge: false,
      budgetExceeded: true,
    });
  });
});
