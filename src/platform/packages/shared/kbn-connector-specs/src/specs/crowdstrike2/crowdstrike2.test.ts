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
import { Crowdstrike2 } from './crowdstrike2';
import { serializeParams, timing } from './client';

const AID = '0123456789abcdef0123456789abcdef';
const AID2 = 'fedcba9876543210fedcba9876543210';
const IOC_ID = 'b'.repeat(64);
const SHA = 'A'.repeat(64);
const COMPOSITE = 'cid1:ind:0123456789abcdef0123456789abcdef:1234-5678';
const BASE = 'https://api.us-2.crowdstrike.com';
const SECRETS = {
  authType: 'oauth_client_credentials',
  tokenUrl: `${BASE}/oauth2/token`,
  clientId: 'client-id',
  clientSecret: 'canary-secret-value',
};

interface Reply {
  status?: number;
  data?: unknown;
  headers?: Record<string, unknown>;
}

const fullUrl = (url: string, params?: Record<string, unknown>) => {
  const query = params ? serializeParams(params) : '';
  return query ? `${url}?${query}` : url;
};

const makeCtx = (replies: Reply[], secrets: object = SECRETS) => {
  const request = jest.fn();
  for (const reply of replies) {
    request.mockResolvedValueOnce({ status: 200, headers: {}, data: {}, ...reply });
  }
  request.mockResolvedValue({ status: 200, headers: {}, data: {} });
  const ctx = {
    client: { request } as unknown as AxiosInstance,
    config: { region: 'us-2' },
    secrets,
    log: loggerMock.create(),
    getClient: jest.fn(),
  } as unknown as ActionContext;
  const calls = () =>
    request.mock.calls.map(([c]) => ({
      method: c.method,
      url: fullUrl(c.url, c.params),
      data: c.data,
    }));
  return { ctx, request, calls };
};

const action = (name: string) => {
  const definition = Crowdstrike2.actions[name];
  if (!definition) {
    throw new Error(`no action ${name}`);
  }
  return definition;
};

/** Validates the input with the action's schema (defaults and refinements), then runs it. */
const run = async (name: string, input: unknown, replies: Reply[] = []) => {
  const { ctx, request, calls } = makeCtx(replies);
  const parsed = action(name).input.parse(input);
  const result = await action(name).handler(ctx, parsed);
  return { result, request, calls };
};

const accepts = (name: string, input: unknown) => action(name).input.safeParse(input).success;

const ok = (data: unknown): Reply => ({ status: 200, data });
const outcomesOf = (result: unknown) => (result as { outcomes?: unknown }).outcomes;
const fail = (status: number, message: string): Reply => ({
  status,
  data: { meta: {}, resources: [], errors: [{ code: status, message }] },
});

beforeEach(() => {
  jest.spyOn(timing, 'sleep').mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('CrowdStrike Falcon connector', () => {
  it('declares its metadata, auth and all 50 actions', () => {
    expect(Crowdstrike2.metadata.id).toBe('.crowdstrike2');
    expect(Crowdstrike2.metadata.minimumLicense).toBe('enterprise');
    expect(Crowdstrike2.metadata.supportedFeatureIds).toContain('agentBuilder');
    expect(Crowdstrike2.auth?.types).toEqual([
      expect.objectContaining({
        type: 'oauth_client_credentials',
        defaults: { tokenEndpointAuthMethod: 'client_secret_post', tokenType: 'Bearer' },
      }),
    ]);
    expect(Object.keys(Crowdstrike2.actions)).toHaveLength(50);
    for (const definition of Object.values(Crowdstrike2.actions)) {
      if (definition.isTool) {
        expect(definition.scope).toBeDefined();
      }
    }
    expect(Crowdstrike2.test?.enabled).toBe(true);
  });

  describe('connection test', () => {
    it('lists one device on the selected cloud', async () => {
      const { ctx, calls } = makeCtx([
        ok({ meta: { pagination: { total: 7 } }, resources: [AID] }),
      ]);
      expect(await Crowdstrike2.test?.handler(ctx)).toMatchObject({ devices: 7 });
      expect(calls()).toEqual([
        { method: 'GET', url: `${BASE}/devices/queries/devices/v1?limit=1`, data: undefined },
      ]);
    });

    it('fails on a rejected credential instead of reporting success', async () => {
      const { ctx } = makeCtx([fail(401, 'access denied'), { status: 401, data: {} }]);
      await expect(Crowdstrike2.test?.handler(ctx)).rejects.toThrow(/401/);
    });

    it('refuses a token URL on another cloud before sending anything', async () => {
      const { ctx, request } = makeCtx([], {
        ...SECRETS,
        tokenUrl: 'https://api.eu-1.crowdstrike.com/oauth2/token',
      });
      await expect(Crowdstrike2.test?.handler(ctx)).rejects.toThrow(/api\.eu-1\.crowdstrike\.com/);
      expect(request).not.toHaveBeenCalled();
    });
  });

  describe('hosts', () => {
    it('[C-edge-containment-pending] getAgentDetails posts the ids and maps the containment state', async () => {
      const { result, calls } = await run('getAgentDetails', { ids: [AID, AID2] }, [
        ok({
          resources: [
            { device_id: AID, status: 'containment_pending' },
            { device_id: AID2, status: 'lift_containment_pending' },
          ],
        }),
      ]);
      expect(calls()[0]).toEqual({
        method: 'POST',
        url: `${BASE}/devices/entities/devices/v2`,
        data: { ids: [AID, AID2] },
      });
      expect(result).toMatchObject({
        resources: [
          { device_id: AID, status: 'containment_pending', containment_state: 'containing' },
          {
            device_id: AID2,
            status: 'lift_containment_pending',
            containment_state: 'lift_pending',
          },
        ],
      });
    });

    it('getAgentDetails reports ids that do not exist as an error', async () => {
      await expect(
        run('getAgentDetails', { ids: [AID] }, [fail(404, 'device not found')])
      ).rejects.toThrow('Status code: 404. Message: device not found');
    });

    it('getAgentOnlineStatus repeats ids in the query string', async () => {
      const { result, calls } = await run('getAgentOnlineStatus', { ids: [AID, AID2] }, [
        ok({ resources: [{ id: AID, state: 'online' }] }),
      ]);
      expect(calls()[0].url).toBe(
        `${BASE}/devices/entities/online-state/v1?ids=${AID}&ids=${AID2}`
      );
      expect(result).toMatchObject({ resources: [{ id: AID, state: 'online' }], errors: [] });
    });

    it('rejects more than 100 ids, empty lists and malformed device ids', () => {
      expect(accepts('getAgentOnlineStatus', { ids: Array(101).fill(AID) })).toBe(false);
      expect(accepts('getAgentOnlineStatus', { ids: Array(100).fill(AID) })).toBe(true);
      expect(accepts('getAgentDetails', { ids: ["x' or 1"] })).toBe(false);
      expect(accepts('getAgentDetails', { ids: [] })).toBe(false);
    });

    const AID3 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const AID4 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const hostStates = (...pairs: Array<[string, string]>) =>
      ok({ resources: pairs.map(([deviceId, status]) => ({ device_id: deviceId, status })) });

    it.each([
      ['containHost', 'contain', 'normal'],
      ['liftContainment', 'lift_containment', 'contained'],
    ])(
      '%s reads the host state, then sends action_name=%s with the ids and action parameters',
      async (name, actionName, startStatus) => {
        const { result, calls } = await run(
          name,
          { ids: [AID], actionParameters: { note: 'soar' } },
          [hostStates([AID, startStatus]), ok({ resources: [{ id: AID }], errors: [] })]
        );
        expect(calls()).toEqual([
          { method: 'POST', url: `${BASE}/devices/entities/devices/v2`, data: { ids: [AID] } },
          {
            method: 'POST',
            url: `${BASE}/devices/entities/devices-actions/v2?action_name=${actionName}`,
            data: { ids: [AID], action_parameters: [{ name: 'note', value: 'soar' }] },
          },
        ]);
        expect(result).toEqual({
          resources: [{ id: AID }],
          errors: [],
          meta: undefined,
          outcomes: [{ id: AID, status: 'requested' }],
        });
      }
    );

    it('containHost omits action_parameters when none are given and retries a 503 on the write', async () => {
      const { calls } = await run('containHost', { ids: [AID] }, [
        hostStates([AID, 'normal']),
        fail(503, 'unavailable'),
        ok({ resources: [{ id: AID }] }),
      ]);
      expect(calls().map((call) => call.url)).toEqual([
        `${BASE}/devices/entities/devices/v2`,
        `${BASE}/devices/entities/devices-actions/v2?action_name=contain`,
        `${BASE}/devices/entities/devices-actions/v2?action_name=contain`,
      ]);
      expect(calls()[2].data).toEqual({ ids: [AID] });
    });

    it('containHost skips contained and containing hosts, reports unknown ids as notFound and sends only the rest', async () => {
      const { result, calls } = await run('containHost', { ids: [AID, AID2, AID3, AID4] }, [
        hostStates(
          [AID, 'contained'],
          [AID2, 'containment_pending'],
          [AID3.toUpperCase(), 'normal']
        ),
        ok({ resources: [{ id: AID3 }], errors: [] }),
      ]);
      expect(calls()).toHaveLength(2);
      expect(calls()[0].data).toEqual({ ids: [AID, AID2, AID3, AID4] });
      expect(calls()[1].data).toEqual({ ids: [AID3] });
      expect(outcomesOf(result)).toEqual([
        { id: AID, status: 'skipped', reason: 'Already contained.' },
        { id: AID2, status: 'skipped', reason: 'Containment is already pending.' },
        { id: AID3, status: 'requested' },
        { id: AID4, status: 'notFound' },
      ]);
    });

    it('containHost sends no write when every host is already contained or unknown', async () => {
      const { result, calls } = await run('containHost', { ids: [AID, AID2] }, [
        hostStates([AID, 'contained']),
      ]);
      expect(calls()).toHaveLength(1);
      expect(calls()[0].url).toBe(`${BASE}/devices/entities/devices/v2`);
      expect(result).toEqual({
        resources: [],
        errors: [],
        outcomes: [
          { id: AID, status: 'skipped', reason: 'Already contained.' },
          { id: AID2, status: 'notFound' },
        ],
      });
    });

    it('containHost reports every id as notFound and sends no write when the state read is a 404', async () => {
      const { result, calls } = await run('containHost', { ids: [AID] }, [
        fail(404, 'device not found'),
      ]);
      expect(calls()).toHaveLength(1);
      expect(outcomesOf(result)).toEqual([{ id: AID, status: 'notFound' }]);
    });

    it('liftContainment skips normal and lift-pending hosts and sends contained and containing ones', async () => {
      const { result, calls } = await run('liftContainment', { ids: [AID, AID2, AID3, AID4] }, [
        hostStates(
          [AID, 'normal'],
          [AID2, 'lift_containment_pending'],
          [AID3, 'contained'],
          [AID4, 'containment_pending']
        ),
        ok({ resources: [{ id: AID3 }, { id: AID4 }], errors: [] }),
      ]);
      expect(calls()[1]).toEqual({
        method: 'POST',
        url: `${BASE}/devices/entities/devices-actions/v2?action_name=lift_containment`,
        data: { ids: [AID3, AID4] },
      });
      expect(outcomesOf(result)).toEqual([
        { id: AID, status: 'skipped', reason: 'Not contained.' },
        { id: AID2, status: 'skipped', reason: 'Lift is already pending.' },
        { id: AID3, status: 'requested' },
        { id: AID4, status: 'requested' },
      ]);
    });

    it('containHost marks a sent id notFound on a 404 error and failed with the message on any other error', async () => {
      const { result } = await run('containHost', { ids: [AID, AID2] }, [
        hostStates([AID, 'normal'], [AID2, 'normal']),
        ok({
          resources: [],
          errors: [
            { code: 404, message: `device ${AID} not found` },
            { code: 409, id: AID2, message: 'action in progress' },
          ],
        }),
      ]);
      expect(outcomesOf(result)).toEqual([
        { id: AID, status: 'notFound' },
        { id: AID2, status: 'failed', reason: 'action in progress' },
      ]);
    });

    it('searchDevices returns one page and the next offset', async () => {
      const { result, calls } = await run(
        'searchDevices',
        { filter: "hostname:'web-01'", limit: 2, offset: 0, sort: 'hostname.asc' },
        [ok({ meta: { pagination: { total: 5, offset: 0 } }, resources: [AID, AID2] })]
      );
      expect(calls()[0].url).toBe(
        `${BASE}/devices/queries/devices/v1?filter=hostname%3A%27web-01%27&limit=2&offset=0&sort=hostname.asc`
      );
      expect(result).toMatchObject({ resources: [AID, AID2], next_offset: 2 });
    });

    it('searchDevices turns a 404 into an empty page', async () => {
      const { result } = await run('searchDevices', {}, [fail(404, 'no devices')]);
      expect(result).toMatchObject({ resources: [], next_offset: null });
    });

    it('listHostGroups sends the sort enum and ends with a null next_offset', async () => {
      const { result, calls } = await run('listHostGroups', { sort: 'name.asc', offset: 1 }, [
        ok({ meta: { pagination: { total: 2 } }, resources: [{ id: 'g1', name: 'Servers' }] }),
      ]);
      expect(calls()[0].url).toBe(`${BASE}/devices/combined/host-groups/v1?offset=1&sort=name.asc`);
      expect(result).toMatchObject({ resources: [{ name: 'Servers' }], next_offset: null });
      expect(accepts('listHostGroups', { sort: 'name' })).toBe(false);
    });
  });

  describe('alerts', () => {
    it('searchAlerts ANDs the convenience filters with quoted values', async () => {
      const { calls } = await run(
        'searchAlerts',
        {
          filter: "tactic:'Execution'",
          status: 'new',
          severity_min: 50,
          hostname: "o'brien",
          start_time: '2026-11-01T00:00:00Z',
          limit: 10,
        },
        [ok({ meta: { pagination: { total: 0 } }, resources: [] })]
      );
      const url = new URL(calls()[0].url);
      expect(url.pathname).toBe('/alerts/queries/alerts/v2');
      expect(url.searchParams.get('filter')).toBe(
        "(tactic:'Execution')+status:'new'+severity:>=50+device.hostname:'o\\'brien'+created_timestamp:>='2026-11-01T00:00:00Z'"
      );
      expect(url.searchParams.get('sort')).toBe('created_timestamp.desc');
    });

    it('[C-edge-alert-search-beyond-10000] searchAlerts rejects offset + limit beyond 10,000', () => {
      expect(accepts('searchAlerts', { offset: 9000, limit: 1001 })).toBe(false);
      expect(accepts('searchAlerts', { offset: 9000, limit: 1000 })).toBe(true);
    });

    it('getAlertDetails posts composite ids', async () => {
      const { result, calls } = await run(
        'getAlertDetails',
        { composite_ids: [COMPOSITE], include_hidden: true },
        [ok({ resources: [{ composite_id: COMPOSITE, severity: 70 }] })]
      );
      expect(calls()[0]).toEqual({
        method: 'POST',
        url: `${BASE}/alerts/entities/alerts/v2?include_hidden=true`,
        data: { composite_ids: [COMPOSITE] },
      });
      expect(result).toMatchObject({ resources: [{ severity: 70 }] });
    });

    it('updateAlert sends one PATCH with removals before additions', async () => {
      const { result, calls } = await run(
        'updateAlert',
        {
          composite_ids: [COMPOSITE],
          status: 'in_progress',
          comment: 'triaged',
          assign_to: 'analyst@example.com',
          add_tags: ['soar:seen'],
          remove_tags: ['old'],
          remove_tags_by_prefix: 'tmp:',
          show_in_ui: true,
        },
        [ok({ meta: {}, resources: [COMPOSITE], errors: [] })]
      );
      expect(calls()[0]).toEqual({
        method: 'PATCH',
        url: `${BASE}/alerts/entities/alerts/v3`,
        data: {
          composite_ids: [COMPOSITE],
          action_parameters: [
            { name: 'update_status', value: 'in_progress' },
            { name: 'append_comment', value: 'triaged' },
            { name: 'assign_to_user_id', value: 'analyst@example.com' },
            { name: 'remove_tag', value: 'old' },
            { name: 'remove_tags_by_prefix', value: 'tmp:' },
            { name: 'add_tag', value: 'soar:seen' },
            { name: 'show_in_ui', value: 'true' },
          ],
        },
      });
      expect(result).toMatchObject({ updated_ids: [COMPOSITE], failures: [] });
    });

    it('updateAlert names an id as updated only when no Falcon error is left unattributed', async () => {
      const other = 'cid1:ind:fedcba9876543210fedcba9876543210:9999-0000';
      const named = await run(
        'updateAlert',
        { composite_ids: [COMPOSITE, other], status: 'closed' },
        [ok({ resources: [], errors: [{ code: 404, message: `alert ${other} not found` }] })]
      );
      expect(named.result).toMatchObject({ updated_ids: [COMPOSITE] });
      const anonymous = await run(
        'updateAlert',
        { composite_ids: [COMPOSITE, other], status: 'closed' },
        [ok({ resources: [], errors: [{ code: 500, message: 'partial write failure' }] })]
      );
      expect(anonymous.result).toMatchObject({
        updated_ids: [],
        failures: [{ code: 500, message: 'partial write failure' }],
      });
    });

    it('updateAlert sends a UUID as assign_to_uuid and a name as assign_to_name', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const first = await run('updateAlert', { composite_ids: [COMPOSITE], assign_to: uuid });
      expect(first.calls()[0].data.action_parameters).toEqual([
        { name: 'assign_to_uuid', value: uuid },
      ]);
      const second = await run('updateAlert', { composite_ids: [COMPOSITE], assign_to: 'Ana' });
      expect(second.calls()[0].data.action_parameters).toEqual([
        { name: 'assign_to_name', value: 'Ana' },
      ]);
    });

    it('[C-edge-updatealert-with-no-change] updateAlert requires a change and refuses assign_to with unassign', () => {
      expect(accepts('updateAlert', { composite_ids: [COMPOSITE] })).toBe(false);
      expect(
        accepts('updateAlert', { composite_ids: [COMPOSITE], assign_to: 'a', unassign: true })
      ).toBe(false);
      expect(accepts('updateAlert', { composite_ids: [COMPOSITE], unassign: true })).toBe(true);
    });

    it('updateAlert does not repeat a PATCH that failed with 5xx', async () => {
      const { ctx, request } = makeCtx([fail(502, 'bad gateway')]);
      const input = action('updateAlert').input.parse({
        composite_ids: [COMPOSITE],
        status: 'closed',
      });
      await expect(action('updateAlert').handler(ctx, input)).rejects.toThrow(
        'Status code: 502. Message: bad gateway'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });
  });

  describe('IOCs', () => {
    const indicator = (type: string, value: string) => ({
      type,
      value,
      action: 'detect',
      platforms: ['linux'],
      severity: 'low',
    });

    it('uploadIOC lower-cases hashes and applies globally without host groups', async () => {
      const { result, calls } = await run(
        'uploadIOC',
        { indicators: [indicator('sha256', SHA)], retrodetects: true },
        [ok({ resources: [{ id: IOC_ID }], errors: null })]
      );
      expect(calls()[0].url).toBe(`${BASE}/iocs/entities/indicators/v1?retrodetects=true`);
      expect(calls()[0].data.indicators[0]).toMatchObject({
        type: 'sha256',
        value: SHA.toLowerCase(),
        applied_globally: true,
      });
      expect(result).toMatchObject({ resources: [{ id: IOC_ID }] });
    });

    it('uploadIOC validates the value against its type', () => {
      expect(accepts('uploadIOC', { indicators: [indicator('ipv4', '10.0.0.300')] })).toBe(false);
      expect(accepts('uploadIOC', { indicators: [indicator('md5', SHA)] })).toBe(false);
      expect(accepts('uploadIOC', { indicators: [indicator('domain', 'evil.example')] })).toBe(
        true
      );
    });

    it('searchIOCs refuses offset together with after', () => {
      expect(accepts('searchIOCs', { offset: 1, after: 'abc' })).toBe(false);
    });

    it('searchIOCs returns the next cursor', async () => {
      const { result } = await run('searchIOCs', { limit: 1 }, [
        ok({ meta: { pagination: { total: 3, after: 'cursor-2' } }, resources: [{ id: IOC_ID }] }),
      ]);
      expect(result).toMatchObject({ next_after: 'cursor-2' });
    });

    it('[C-edge-ioc-delete-scope] deleteIOC sends only ids and the comment, never a filter', async () => {
      const { result, calls } = await run('deleteIOC', { ids: [IOC_ID], comment: 'expired' }, [
        ok({ resources: [IOC_ID] }),
      ]);
      expect(outcomesOf(result)).toEqual([{ id: IOC_ID, status: 'requested' }]);
      expect(calls()[0]).toEqual({
        method: 'DELETE',
        url: `${BASE}/iocs/entities/indicators/v1?ids=${IOC_ID}&comment=expired`,
        data: undefined,
      });
      expect(calls()[0].url).not.toMatch(/filter=|from_parent=/);
      expect(accepts('deleteIOC', { ids: [] })).toBe(false);
    });

    it('deleteIOC reports every id as notFound, without an error, when Falcon answers 404 for all of them', async () => {
      const IOC_ID2 = 'c'.repeat(64);
      const { result, calls } = await run('deleteIOC', { ids: [IOC_ID, IOC_ID2] }, [
        fail(404, 'indicators not found'),
      ]);
      expect(calls()).toHaveLength(1);
      expect(result).toMatchObject({
        resources: [],
        outcomes: [
          { id: IOC_ID, status: 'notFound' },
          { id: IOC_ID2, status: 'notFound' },
        ],
      });
    });

    it('deleteIOC marks only the id a 404 error names as notFound and the deleted one as requested', async () => {
      const IOC_ID2 = 'c'.repeat(64);
      const { result } = await run('deleteIOC', { ids: [IOC_ID, IOC_ID2] }, [
        ok({
          resources: [IOC_ID],
          errors: [{ code: 404, message: `indicator ${IOC_ID2} not found` }],
        }),
      ]);
      expect(outcomesOf(result)).toEqual([
        { id: IOC_ID, status: 'requested' },
        { id: IOC_ID2, status: 'notFound' },
      ]);
    });

    it('findHostsByIndicator returns an empty list and a count of 0 when no host saw it', async () => {
      const { result } = await run(
        'findHostsByIndicator',
        { type: 'domain', value: 'Evil.Example' },
        [fail(404, 'no hosts'), fail(404, 'no hosts')]
      );
      expect(result).toMatchObject({ resources: [], device_count: 0 });
    });

    it('findHostsByIndicator fills device_count from the count route', async () => {
      const { result, calls } = await run('findHostsByIndicator', { type: 'sha256', value: SHA }, [
        ok({ meta: { pagination: { total: 2 } }, resources: [AID, AID2] }),
        ok({ resources: [{ id: SHA.toLowerCase(), device_count: 2 }] }),
      ]);
      expect(calls()[0].url).toBe(
        `${BASE}/iocs/queries/indicators/devices/v1?type=sha256&value=${SHA.toLowerCase()}`
      );
      expect(result).toMatchObject({ resources: [AID, AID2], device_count: 2 });
    });

    it('findHostsByIndicator keeps the device count on an empty page after the last one', async () => {
      const { result, calls } = await run(
        'findHostsByIndicator',
        { type: 'sha256', value: SHA, offset: '0:1450837263' },
        [
          ok({ meta: { pagination: { limit: 2, offset: '' } }, resources: [] }),
          ok({ resources: [{ id: SHA.toLowerCase(), device_count: 2 }] }),
        ]
      );
      expect(calls()).toHaveLength(2);
      expect(result).toMatchObject({ resources: [], device_count: 2, next_offset: null });
    });

    it('findHostsByIndicator reports device_count null when the count is unknown on a later page', async () => {
      const { result } = await run(
        'findHostsByIndicator',
        { type: 'sha256', value: SHA, offset: '0:1450837263' },
        [
          ok({ meta: { pagination: { limit: 2, offset: '' } }, resources: [] }),
          fail(400, 'count lookup refused'),
        ]
      );
      expect(result).toMatchObject({ resources: [], device_count: null, next_offset: null });
    });

    it('findHostsByIndicator uses the page size as the count only for a single complete page', async () => {
      const single = await run('findHostsByIndicator', { type: 'sha256', value: SHA }, [
        ok({ meta: { pagination: { limit: 100, offset: '' } }, resources: [AID, AID2] }),
        fail(400, 'count lookup refused'),
      ]);
      expect(single.result).toMatchObject({ device_count: 2, next_offset: null });

      const firstOfMany = await run(
        'findHostsByIndicator',
        { type: 'sha256', value: SHA, limit: 2 },
        [
          ok({ meta: { pagination: { limit: 2, offset: '0:9' } }, resources: [AID, AID2] }),
          fail(400, 'count lookup refused'),
        ]
      );
      expect(firstOfMany.result).toMatchObject({ device_count: null, next_offset: '0:9' });
    });

    it('findHostsByIndicator pages with the cursor Falcon returns in meta.pagination.offset', async () => {
      // Live US-2: this route ignores a numeric offset and returns an opaque cursor, empty on the last page.
      const first = await run(
        'findHostsByIndicator',
        { type: 'domain', value: 'example.com', limit: 2 },
        [
          ok({
            meta: { pagination: { limit: 2, offset: '0:1450837263' } },
            resources: [AID, AID2],
          }),
          ok({ resources: [{ id: 'example.com', device_count: 4 }] }),
        ]
      );
      expect(first.result).toMatchObject({ device_count: 4, next_offset: '0:1450837263' });

      const last = await run(
        'findHostsByIndicator',
        { type: 'domain', value: 'example.com', limit: 2, offset: '0:1450837263' },
        [
          ok({ meta: { pagination: { limit: 2, offset: '' } }, resources: [AID, AID2] }),
          ok({ resources: [{ id: 'example.com', device_count: 4 }] }),
        ]
      );
      expect(last.calls()[0].url).toContain('offset=0%3A1450837263');
      expect(last.result).toMatchObject({ resources: [AID, AID2], next_offset: null });
    });

    it('findHostsByIndicator takes the cursor as a string, not a numeric position', () => {
      expect(
        accepts('findHostsByIndicator', { type: 'domain', value: 'example.com', offset: '0:1' })
      ).toBe(true);
      expect(
        accepts('findHostsByIndicator', { type: 'domain', value: 'example.com', offset: 2 })
      ).toBe(false);
    });
  });

  describe('Real Time Response', () => {
    it.each([
      ['executeRTRCommand', 'kill 4'],
      ['batchActiveResponderExecuteRTR', 'put tool.exe'],
      ['batchAdminExecuteRTR', 'format c:'],
    ])('%s rejects "%s" for its tier before opening a session', async (name, command) => {
      const { ctx, request } = makeCtx([]);
      const input = action(name).input.parse({ endpoint_ids: [AID], command });
      await expect(action(name).handler(ctx, input)).rejects.toThrow(/tier/i);
      expect(request).not.toHaveBeenCalled();
    });

    it.each([
      ['read_only', 'command'],
      ['active_responder', 'active-responder-command'],
      ['admin', 'admin-command'],
    ])('getRTRCommandStatus reads tier %s from its route', async (tier, route) => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const { result, calls } = await run('getRTRCommandStatus', { cloud_request_id: id, tier }, [
        ok({ resources: [{ complete: true, stdout: 'done', stderr: '', base_command: 'ls' }] }),
      ]);
      expect(calls()[0].url).toBe(
        `${BASE}/real-time-response/entities/${route}/v1?cloud_request_id=${id}&sequence_id=0`
      );
      expect(result).toMatchObject({ complete: true, stdout: 'done' });
    });

    it('findHostsByIndicator accepts a domain up to 253 characters, the longest valid indicator', () => {
      const domain = ['a'.repeat(63), 'a'.repeat(63), 'a'.repeat(63), 'a'.repeat(61)].join('.');
      expect(accepts('findHostsByIndicator', { type: 'domain', value: domain })).toBe(true);
      expect(accepts('findHostsByIndicator', { type: 'domain', value: `${domain}a` })).toBe(false);
    });

    it('rtrKillProcess accepts process ids from 1 only', () => {
      expect(accepts('rtrKillProcess', { device_id: AID, process_id: 0 })).toBe(false);
      expect(accepts('rtrKillProcess', { device_id: AID, process_id: 1 })).toBe(true);
    });

    it('rtrListProcesses reads every output chunk before parsing the ps table', async () => {
      jest.spyOn(timing, 'now').mockReturnValue(0);
      const { result, calls } = await run('rtrListProcesses', { device_id: AID }, [
        ok({ resources: [{ session_id: 'sess-1' }] }),
        ok({ resources: [{ cloud_request_id: 'req-1' }] }),
        ok({
          resources: [{ complete: true, stdout: 'Name     Id\n', stderr: '', sequence_id: 1 }],
        }),
        ok({
          resources: [{ complete: true, stdout: '----     --\n', stderr: '', sequence_id: 2 }],
        }),
        ok({ resources: [{ complete: true, stdout: 'svchost  4\n', stderr: '', sequence_id: 0 }] }),
        ok({}),
      ]);
      expect(calls().map((c) => c.url.split('sequence_id=')[1] ?? c.method)).toEqual([
        'POST',
        'POST',
        '0',
        '1',
        '2',
        'DELETE',
      ]);
      expect(result).toMatchObject({
        complete: true,
        stdout: 'Name     Id\n----     --\nsvchost  4\n',
        processes: [{ Name: 'svchost', Id: '4' }],
      });
    });

    it('rtrListProcesses parses the ps table and deletes the session', async () => {
      jest.spyOn(timing, 'now').mockReturnValue(0);
      const { result, calls } = await run('rtrListProcesses', { device_id: AID }, [
        ok({ resources: [{ session_id: 'sess-1' }] }),
        ok({ resources: [{ cloud_request_id: 'req-1' }] }),
        ok({
          resources: [
            { complete: true, stdout: 'Name     Id\n----     --\nsvchost  4\n', stderr: '' },
          ],
        }),
        ok({}),
      ]);
      expect(calls().map((c) => `${c.method} ${c.url.split('?')[0]}`)).toEqual([
        `POST ${BASE}/real-time-response/entities/sessions/v1`,
        `POST ${BASE}/real-time-response/entities/command/v1`,
        `GET ${BASE}/real-time-response/entities/command/v1`,
        `DELETE ${BASE}/real-time-response/entities/sessions/v1`,
      ]);
      expect(result).toMatchObject({ complete: true, processes: [{ Name: 'svchost', Id: '4' }] });
    });
  });

  describe('Real Time Response library', () => {
    it('getRTRCloudScripts lists ids, then their details', async () => {
      const { result, calls } = await run('getRTRCloudScripts', { limit: 2 }, [
        ok({ meta: { pagination: { total: 1 } }, resources: ['s1'] }),
        ok({ resources: [{ id: 's1', name: 'collect' }] }),
      ]);
      expect(calls().map((c) => c.url)).toEqual([
        `${BASE}/real-time-response/queries/scripts/v1?limit=2`,
        `${BASE}/real-time-response/entities/scripts/v2?ids=s1`,
      ]);
      expect(result).toMatchObject({ resources: [{ name: 'collect' }], next_offset: null });
    });

    it('listRTRFiles skips the details call when nothing matched', async () => {
      const { result, calls } = await run('listRTRFiles', {}, [ok({ resources: [] })]);
      expect(calls()).toHaveLength(1);
      expect(result).toMatchObject({ resources: [] });
    });

    it('uploadRTRScript sends a multipart form with repeated platforms', async () => {
      const { calls } = await run(
        'uploadRTRScript',
        {
          name: 'collect',
          description: 'collect logs',
          content: 'Get-Process',
          permission_type: 'private',
          platform: ['windows', 'linux'],
        },
        [ok({ resources: [{ id: 's1' }] })]
      );
      const form = calls()[0].data as FormData;
      expect(calls()[0].url).toBe(`${BASE}/real-time-response/entities/scripts/v2`);
      expect(form.getAll('platform')).toEqual(['windows', 'linux']);
      expect(form.get('permission_type')).toBe('private');
    });

    it('uploadRTRFile sends the decoded file under its name', async () => {
      const { calls } = await run(
        'uploadRTRFile',
        {
          name: 'tool.exe',
          description: 'tool',
          content_base64: Buffer.from('MZ').toString('base64'),
        },
        [ok({ resources: [{ id: 'f1' }] })]
      );
      const file = (calls()[0].data as FormData).get('file') as File;
      expect(file.name).toBe('tool.exe');
      expect(await file.text()).toBe('MZ');
    });

    it.each([
      ['deleteRTRFile', 'put-files'],
      ['deleteRTRScript', 'scripts'],
    ])('%s deletes one id', async (name, route) => {
      const { result, calls } = await run(name, { id: 'abc' }, [ok({ resources: [] })]);
      expect(calls()[0]).toEqual({
        method: 'DELETE',
        url: `${BASE}/real-time-response/entities/${route}/v1?ids=abc`,
        data: undefined,
      });
      expect(outcomesOf(result)).toEqual([{ id: 'abc', status: 'requested' }]);
    });

    it.each(['deleteRTRFile', 'deleteRTRScript'])(
      '%s reports an id that no longer exists as notFound instead of an error',
      async (name) => {
        const { result, calls } = await run(name, { id: 'abc' }, [fail(404, 'not found')]);
        expect(calls()).toHaveLength(1);
        expect(result).toMatchObject({
          resources: [],
          outcomes: [{ id: 'abc', status: 'notFound' }],
        });
      }
    );
  });

  describe('quarantine', () => {
    it('listQuarantinedFiles reads ids, then posts them for details', async () => {
      const { result, calls } = await run('listQuarantinedFiles', { q: 'invoice' }, [
        ok({ meta: { pagination: { total: 1 } }, resources: ['q1'] }),
        ok({ resources: [{ id: 'q1', state: 'quarantined' }] }),
      ]);
      expect(calls()[1]).toEqual({
        method: 'POST',
        url: `${BASE}/quarantine/entities/quarantined-files/GET/v1`,
        data: { ids: ['q1'] },
      });
      expect(result).toMatchObject({ resources: [{ state: 'quarantined' }] });
    });

    it('applyQuarantineFileAction patches the ids with the action and comment', async () => {
      const { calls } = await run(
        'applyQuarantineFileAction',
        { ids: ['q1'], action: 'release', comment: 'false positive' },
        [ok({ resources: [] })]
      );
      expect(calls()[0]).toEqual({
        method: 'PATCH',
        url: `${BASE}/quarantine/entities/quarantined-files/v1`,
        data: { ids: ['q1'], action: 'release', comment: 'false positive' },
      });
    });
  });

  describe('intelligence and sandbox', () => {
    it.each([
      ['a'.repeat(32), 'hash_md5'],
      ['b'.repeat(40), 'hash_sha1'],
      [SHA, 'hash_sha256'],
    ])('getFileReputation picks the indicator type from the hash length', async (hash, type) => {
      const { calls, result } = await run('getFileReputation', { hash }, [ok({ resources: [] })]);
      expect(new URL(calls()[0].url).searchParams.get('filter')).toBe(
        `indicator:'${hash.toLowerCase()}'+type:'${type}'`
      );
      expect(result).toMatchObject({ verdict: 'not_found' });
    });

    it('getUrlReputation looks up a URL as url and a bare domain as domain', async () => {
      const url = await run('getUrlReputation', { url: 'https://evil.example/x' }, [
        ok({ resources: [{ malicious_confidence: 'high' }] }),
      ]);
      expect(new URL(url.calls()[0].url).searchParams.get('filter')).toContain("type:'url'");
      expect(url.result).toMatchObject({ verdict: 'high' });
      const domain = await run('getUrlReputation', { url: 'evil.example' }, [
        ok({ resources: [] }),
      ]);
      expect(new URL(domain.calls()[0].url).searchParams.get('filter')).toContain("type:'domain'");
    });

    it('detonateUrl needs exactly one of url or submission_id', () => {
      expect(accepts('detonateUrl', {})).toBe(false);
      expect(accepts('detonateUrl', { url: 'https://a.example', submission_id: 'x' })).toBe(false);
      expect(accepts('detonateUrl', { url: 'https://a.example' })).toBe(true);
    });

    it('detonateFile needs exactly one of content_base64, sha256 or submission_id', () => {
      expect(accepts('detonateFile', {})).toBe(false);
      expect(accepts('detonateFile', { sha256: SHA, submission_id: 'x' })).toBe(false);
      expect(accepts('detonateFile', { sha256: SHA })).toBe(true);
    });

    it('detonateUrl submits, polls and returns the verdict', async () => {
      const { result, calls } = await run('detonateUrl', { url: 'https://evil.example' }, [
        ok({ resources: [{ id: 'sub-1' }] }),
        ok({ resources: [{ id: 'sub-1', state: 'success' }] }),
        ok({ resources: [{ verdict: 'malicious', sandbox: [{ threat_score: 90 }] }] }),
      ]);
      expect(calls()[0].data).toEqual({
        sandbox: [{ url: 'https://evil.example', environment_id: 160 }],
      });
      expect(result).toMatchObject({
        submission_id: 'sub-1',
        complete: true,
        verdict: 'malicious',
        threat_score: 90,
      });
    });

    it('spotlightSearchVulnerability repeats facets and returns the cursor', async () => {
      const { result, calls } = await run(
        'spotlightSearchVulnerability',
        { filter: `aid:'${AID}'`, facet: ['cve', 'remediation'] },
        [ok({ meta: { pagination: { after: 'next' } }, resources: [{ id: 'v1' }] })]
      );
      expect(calls()[0].url).toContain('facet=cve&facet=remediation');
      expect(result).toMatchObject({ next_after: 'next' });
    });
  });

  describe('token and rate limits', () => {
    it('re-requests a token once after a 401 and repeats the call with it', async () => {
      const { result, calls, request } = await run('getAgentOnlineStatus', { ids: [AID] }, [
        fail(401, 'access denied, invalid bearer token'),
        ok({ access_token: 'fresh', expires_in: 1799 }),
        ok({ resources: [{ id: AID, state: 'offline' }] }),
      ]);
      expect(calls()[1].url).toBe(`${BASE}/oauth2/token`);
      expect(request.mock.calls[2][0].headers.Authorization).toBe('Bearer fresh');
      expect(result).toMatchObject({ resources: [{ state: 'offline' }] });
    });

    it('waits for the reset Falcon gives on 429, then succeeds', async () => {
      const { result } = await run('getAgentOnlineStatus', { ids: [AID] }, [
        { ...fail(429, 'API rate limit exceeded.'), headers: { 'retry-after': '2' } },
        ok({ resources: [{ id: AID, state: 'online' }] }),
      ]);
      expect(timing.sleep).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ resources: [{ state: 'online' }] });
    });

    it('never puts the client secret in an error message', async () => {
      const error = await run('getAgentDetails', { ids: [AID] }, [
        fail(403, 'access denied, authorization failed'),
      ]).catch((e: Error) => e);
      expect(String((error as Error).message)).toMatch(/Status code: 403/);
      expect(String((error as Error).message)).not.toContain('canary');
    });
  });
});
