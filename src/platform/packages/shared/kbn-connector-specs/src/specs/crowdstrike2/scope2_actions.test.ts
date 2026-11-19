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
const SHA = 'A'.repeat(64);
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
const fail = (status: number, message: string): Reply => ({
  status,
  data: { meta: {}, resources: [], errors: [{ code: status, message }] },
});

beforeEach(() => {
  jest.spyOn(timing, 'sleep').mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

const GROUP = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const CASE_ID = 'case-0001';
const USER = '11111111-2222-4333-8444-555555555555';
const FIELD_VALUES = [
  {
    name: 'ImageFilename',
    label: 'Image Filename',
    type: 'excludable',
    values: [{ label: 'include', value: '.*\\\\evil\\.exe' }],
  },
];

const ORDER_AFTER: Array<[string, string[]]> = [
  ['listHostGroups', ['addHostGroupMembers', 'removeHostGroupMembers']],
  ['updateAlert', ['searchCases', 'getCaseDetails', 'updateCase', 'addCaseTags', 'removeCaseTags']],
  [
    'findHostsByIndicator',
    ['listIOARules', 'createIOARule', 'updateIOARule', 'deleteIOARule', 'searchIOAExclusions'],
  ],
  ['applyQuarantineFileAction', ['createScan', 'getScanResults']],
];

describe('CrowdStrike Falcon connector, scope change 2 actions', () => {
  it('places the 14 actions after the actions they extend', () => {
    const names = Object.keys(Crowdstrike2.actions);
    for (const [anchor, added] of ORDER_AFTER) {
      const at = names.indexOf(anchor);
      expect(names.slice(at + 1, at + 1 + added.length)).toEqual(added);
    }
  });

  it('declares a scope on every new action and exposes only the reads and reversible changes as tools', () => {
    // Host group membership changes policy assignment and custom IOA rules can weaken protection.
    const notTools = [
      'addHostGroupMembers',
      'removeHostGroupMembers',
      'createIOARule',
      'updateIOARule',
      'deleteIOARule',
    ];
    for (const [, added] of ORDER_AFTER) {
      for (const name of added) {
        expect({ name, isTool: action(name).isTool }).toEqual({
          name,
          isTool: !notTools.includes(name),
        });
        expect(action(name).scope).toBeDefined();
      }
    }
  });

  describe('host group members', () => {
    it.each([
      ['addHostGroupMembers', 'add-hosts'],
      ['removeHostGroupMembers', 'remove-hosts'],
    ])('%s posts action_name=%s with a device_id filter built from the ids', async (name, verb) => {
      const { result, calls } = await run(name, { group_id: GROUP, host_ids: [AID, AID2, AID] }, [
        ok({ resources: [{ id: GROUP, group_type: 'static' }], errors: [] }),
      ]);
      expect(calls()).toEqual([
        {
          method: 'POST',
          url: `${BASE}/devices/entities/host-group-actions/v1?action_name=${verb}`,
          data: {
            ids: [GROUP],
            action_parameters: [{ name: 'filter', value: `device_id:['${AID}','${AID2}']` }],
          },
        },
      ]);
      expect(result).toMatchObject({ resources: [{ id: GROUP }], errors: [] });
      // No membership pre-read (membership shows late in host details): every host is reported requested.
      expect((result as { outcomes: unknown }).outcomes).toEqual([
        { id: AID, status: 'requested' },
        { id: AID2, status: 'requested' },
      ]);
    });

    it('reports a host that an error names as failed with the message', async () => {
      const { result } = await run(
        'addHostGroupMembers',
        { group_id: GROUP, host_ids: [AID, AID2] },
        [
          ok({
            resources: [{ id: GROUP }],
            errors: [{ code: 400, message: `host ${AID2} is not eligible` }],
          }),
        ]
      );
      expect((result as { outcomes: unknown }).outcomes).toEqual([
        { id: AID, status: 'requested' },
        { id: AID2, status: 'failed', reason: `host ${AID2} is not eligible` },
      ]);
    });

    it('sends disable_hostname_check in the query when given', async () => {
      const { calls } = await run(
        'addHostGroupMembers',
        { group_id: GROUP, host_ids: [AID], disable_hostname_check: true },
        [ok({ resources: [{ id: GROUP }] })]
      );
      expect(calls()[0].url).toBe(
        `${BASE}/devices/entities/host-group-actions/v1?action_name=add-hosts&disable_hostname_check=true`
      );
    });

    it('rejects filter injection, more than 100 hosts and malformed group ids before any call', () => {
      expect(accepts('addHostGroupMembers', { group_id: GROUP, host_ids: [`${AID}'],x:['`] })).toBe(
        false
      );
      expect(
        accepts('addHostGroupMembers', { group_id: GROUP, host_ids: Array(101).fill(AID) })
      ).toBe(false);
      expect(
        accepts('addHostGroupMembers', { group_id: GROUP, host_ids: Array(100).fill(AID) })
      ).toBe(true);
      expect(accepts('removeHostGroupMembers', { group_id: "g' or 1", host_ids: [AID] })).toBe(
        false
      );
      expect(accepts('removeHostGroupMembers', { group_id: 'a'.repeat(65), host_ids: [AID] })).toBe(
        false
      );
      expect(accepts('removeHostGroupMembers', { group_id: GROUP, host_ids: [] })).toBe(false);
    });

    it('keeps the filter safe even when the handler is called without schema validation', async () => {
      const { ctx, request } = makeCtx([]);
      await expect(
        action('addHostGroupMembers').handler(ctx, { group_id: GROUP, host_ids: ["x'] OR ['"] })
      ).rejects.toThrow(/32 hexadecimal/);
      expect(request).not.toHaveBeenCalled();
    });

    it('retries a 503 (idempotent in effect) and names the Host groups write scope on a 403', async () => {
      const retried = await run('addHostGroupMembers', { group_id: GROUP, host_ids: [AID] }, [
        fail(503, 'busy'),
        ok({ resources: [{ id: GROUP }] }),
      ]);
      expect(retried.request).toHaveBeenCalledTimes(2);
      await expect(
        run('removeHostGroupMembers', { group_id: GROUP, host_ids: [AID] }, [fail(403, 'denied')])
      ).rejects.toThrow(
        'Status code: 403. Message: denied; the API client needs the Host groups: Write scope'
      );
    });

    it('returns the error of a dynamic group or an unknown group', async () => {
      await expect(
        run('addHostGroupMembers', { group_id: GROUP, host_ids: [AID] }, [
          fail(400, 'cannot add hosts to a dynamic group'),
        ])
      ).rejects.toThrow('Status code: 400. Message: cannot add hosts to a dynamic group');
      await expect(
        run('addHostGroupMembers', { group_id: GROUP, host_ids: [AID] }, [fail(404, 'no group')])
      ).rejects.toThrow('Status code: 404. Message: no group');
    });
  });

  describe('cases', () => {
    it('searchCases sends filter, q, sort, offset and a default limit of 100, and pages', async () => {
      const { result, calls } = await run(
        'searchCases',
        { filter: "status:'new'", q: 'phish', sort: 'created_timestamp|desc', offset: 0 },
        [ok({ meta: { pagination: { total: 3 } }, resources: [CASE_ID, 'case-0002'] })]
      );
      expect(calls()[0]).toEqual({
        method: 'GET',
        url: `${BASE}/cases/queries/cases/v1?filter=status%3A%27new%27&q=phish&sort=created_timestamp%7Cdesc&offset=0&limit=100`,
        data: undefined,
      });
      expect(result).toEqual({
        ids: [CASE_ID, 'case-0002'],
        total: 3,
        next_offset: 2,
        errors: [],
        meta: { pagination: { total: 3 } },
      });
    });

    it('searchCases returns an empty page on a 404 and caps the page size at 500', async () => {
      const { result } = await run('searchCases', {}, [fail(404, 'nothing')]);
      expect(result).toMatchObject({ ids: [], total: 0, next_offset: null });
      expect(accepts('searchCases', { limit: 500 })).toBe(true);
      expect(accepts('searchCases', { limit: 501 })).toBe(false);
      expect(accepts('searchCases', { limit: 0 })).toBe(false);
    });

    it('getCaseDetails posts the ids and lists the ids Falcon did not return', async () => {
      const { result, calls } = await run('getCaseDetails', { case_ids: [CASE_ID, 'gone'] }, [
        ok({ resources: [{ id: CASE_ID, status: 'new', severity: 3 }], errors: [] }),
      ]);
      expect(calls()[0]).toEqual({
        method: 'POST',
        url: `${BASE}/cases/entities/cases/v2`,
        data: { ids: [CASE_ID, 'gone'] },
      });
      expect(result).toEqual({
        cases: [{ id: CASE_ID, status: 'new', severity: 3 }],
        missing_ids: ['gone'],
        errors: [],
        meta: undefined,
      });
    });

    it('getCaseDetails lists every id as missing on a 404 and retries a 500', async () => {
      const missing = await run('getCaseDetails', { case_ids: ['gone'] }, [fail(404, 'not found')]);
      expect(missing.result).toMatchObject({ cases: [], missing_ids: ['gone'] });
      const retried = await run('getCaseDetails', { case_ids: [CASE_ID] }, [
        fail(500, 'oops'),
        ok({ resources: [{ id: CASE_ID }] }),
      ]);
      expect(retried.request).toHaveBeenCalledTimes(2);
      expect(accepts('getCaseDetails', { case_ids: Array(101).fill(CASE_ID) })).toBe(false);
      expect(accepts('getCaseDetails', { case_ids: [] })).toBe(false);
    });

    it('updateCase patches only the fields given, a numeric severity as a number', async () => {
      const { result, calls } = await run(
        'updateCase',
        {
          case_id: CASE_ID,
          status: 'in_progress',
          assigned_to_user_uuid: USER,
          severity: '4',
          expected_version: 7,
        },
        [ok({ resources: [{ id: CASE_ID, status: 'in_progress', version: 8 }] })]
      );
      expect(calls()[0]).toEqual({
        method: 'PATCH',
        url: `${BASE}/cases/entities/cases/v2`,
        data: {
          id: CASE_ID,
          fields: { status: 'in_progress', assigned_to_user_uuid: USER, severity: 4 },
          expected_version: 7,
        },
      });
      expect(result).toEqual({
        case: { id: CASE_ID, status: 'in_progress', version: 8 },
        errors: [],
        meta: undefined,
      });
    });

    it('updateCase sends a named severity as a string and returns case null when Falcon returns none', async () => {
      const { result, calls } = await run(
        'updateCase',
        {
          case_id: CASE_ID,
          severity: 'high',
          remove_user_assignment: true,
          name: 'n',
          description: '',
        },
        [ok({})]
      );
      expect(calls()[0].data).toEqual({
        id: CASE_ID,
        fields: { remove_user_assignment: true, name: 'n', description: '', severity: 'high' },
      });
      expect(result).toMatchObject({ case: null });
    });

    it('updateCase needs one change, a UUID assignee, and not both assignee and removal', () => {
      expect(accepts('updateCase', { case_id: CASE_ID })).toBe(false);
      expect(accepts('updateCase', { case_id: CASE_ID, remove_user_assignment: false })).toBe(
        false
      );
      expect(accepts('updateCase', { case_id: CASE_ID, assigned_to_user_uuid: 'alice' })).toBe(
        false
      );
      expect(
        accepts('updateCase', {
          case_id: CASE_ID,
          assigned_to_user_uuid: USER,
          remove_user_assignment: true,
        })
      ).toBe(false);
      expect(accepts('updateCase', { case_id: CASE_ID, description: 'd'.repeat(4001) })).toBe(
        false
      );
      expect(accepts('updateCase', { case_id: CASE_ID, description: 'd'.repeat(4000) })).toBe(true);
    });

    it('updateCase does not repeat a 500 and reports a 409 version conflict', async () => {
      const failed = run('updateCase', { case_id: CASE_ID, status: 'closed' }, [fail(500, 'boom')]);
      await expect(failed).rejects.toThrow('Status code: 500. Message: boom');
      const conflict = await run('updateCase', { case_id: CASE_ID, status: 'closed' }, [
        fail(409, `case ${CASE_ID} has changed`),
      ]).catch((error: Error) => error);
      expect((conflict as Error).message).toBe(
        `Status code: 409. Message: case ${CASE_ID} has changed`
      );
    });

    const caseWithTags = (tags: string[]) => ok({ resources: [{ id: CASE_ID, tags }] });
    const CASE_READ = {
      method: 'POST',
      url: `${BASE}/cases/entities/cases/v2`,
      data: { ids: [CASE_ID] },
    };

    it('addCaseTags reads the case, then posts the tags; removeCaseTags repeats tag in the query', async () => {
      const added = await run('addCaseTags', { case_id: CASE_ID, tags: ['soar-test:a', 'b'] }, [
        caseWithTags(['other']),
        ok({ resources: [CASE_ID] }),
      ]);
      expect(added.calls()).toEqual([
        CASE_READ,
        {
          method: 'POST',
          url: `${BASE}/cases/entities/case-tags/v1`,
          data: { id: CASE_ID, tags: ['soar-test:a', 'b'] },
        },
      ]);
      expect(added.result).toEqual({
        resources: [CASE_ID],
        errors: [],
        meta: undefined,
        outcomes: [
          { id: 'soar-test:a', status: 'requested' },
          { id: 'b', status: 'requested' },
        ],
      });
      const removed = await run(
        'removeCaseTags',
        { case_id: CASE_ID, tags: ['soar-test:a', 'b'] },
        [caseWithTags(['soar-test:a', 'b']), ok({ resources: [] })]
      );
      expect(removed.calls()).toEqual([
        CASE_READ,
        {
          method: 'DELETE',
          url: `${BASE}/cases/entities/case-tags/v1?id=${CASE_ID}&tag=soar-test%3Aa&tag=b`,
          data: undefined,
        },
      ]);
    });

    it('the tag actions skip tags already in the requested state and send only the rest', async () => {
      const added = await run('addCaseTags', { case_id: CASE_ID, tags: ['a', 'b'] }, [
        caseWithTags(['a']),
        ok({ resources: [CASE_ID] }),
      ]);
      expect(added.calls()[1].data).toEqual({ id: CASE_ID, tags: ['b'] });
      expect((added.result as { outcomes: unknown }).outcomes).toEqual([
        { id: 'a', status: 'skipped', reason: 'Tag already present.' },
        { id: 'b', status: 'requested' },
      ]);
      const removed = await run('removeCaseTags', { case_id: CASE_ID, tags: ['a', 'b'] }, [
        caseWithTags(['b']),
        ok({ resources: [] }),
      ]);
      expect(removed.calls()[1].url).toBe(
        `${BASE}/cases/entities/case-tags/v1?id=${CASE_ID}&tag=b`
      );
      expect((removed.result as { outcomes: unknown }).outcomes).toEqual([
        { id: 'a', status: 'skipped', reason: 'Tag not present.' },
        { id: 'b', status: 'requested' },
      ]);
    });

    it('the tag actions send no write and return the case as read when every tag is already in state', async () => {
      const added = await run('addCaseTags', { case_id: CASE_ID, tags: ['a'] }, [
        caseWithTags(['a', 'z']),
      ]);
      expect(added.calls()).toEqual([CASE_READ]);
      expect(added.result).toEqual({
        resources: [{ id: CASE_ID, tags: ['a', 'z'] }],
        errors: [],
        meta: undefined,
        outcomes: [{ id: 'a', status: 'skipped', reason: 'Tag already present.' }],
      });
      const removed = await run('removeCaseTags', { case_id: CASE_ID, tags: ['b'] }, [
        caseWithTags(['a']),
      ]);
      expect(removed.calls()).toEqual([CASE_READ]);
      expect((removed.result as { outcomes: unknown }).outcomes).toEqual([
        { id: 'b', status: 'skipped', reason: 'Tag not present.' },
      ]);
    });

    it('the tag actions send every tag when the case is not found by the read', async () => {
      const added = await run('addCaseTags', { case_id: CASE_ID, tags: ['a'] }, [
        fail(404, 'case not found'),
        ok({ resources: [CASE_ID] }),
      ]);
      expect(added.calls()[1].data).toEqual({ id: CASE_ID, tags: ['a'] });
      expect((added.result as { outcomes: unknown }).outcomes).toEqual([
        { id: 'a', status: 'requested' },
      ]);
    });

    it('accepts the case id format Falcon returns and passes the case back as received', async () => {
      const LIVE_CASE_ID = '01a18b9e-d573-7772-8990-cccca30325dc';
      const liveCase = {
        id: LIVE_CASE_ID,
        version: 4,
        consistency: { consistent: false, version: 3 },
        tags: ['soar-test'],
      };
      const details = await run('getCaseDetails', { case_ids: [LIVE_CASE_ID] }, [
        ok({ resources: [liveCase], errors: [] }),
      ]);
      expect(details.calls()[0].data).toEqual({ ids: [LIVE_CASE_ID] });
      expect(details.result).toEqual({
        cases: [liveCase],
        missing_ids: [],
        errors: [],
        meta: undefined,
      });
      // consistency.consistent=false: the record read may miss a recent change, so its tags are not
      // trusted and every tag is sent even though the case already shows it.
      const added = await run('addCaseTags', { case_id: LIVE_CASE_ID, tags: ['soar-test'] }, [
        ok({ resources: [liveCase] }),
        ok({ resources: [liveCase] }),
      ]);
      expect(added.calls()[0].data).toEqual({ ids: [LIVE_CASE_ID] });
      expect(added.calls()[1].data).toEqual({ id: LIVE_CASE_ID, tags: ['soar-test'] });
      expect(added.result).toEqual({
        resources: [liveCase],
        errors: [],
        meta: undefined,
        outcomes: [{ id: 'soar-test', status: 'requested' }],
      });
      const removed = await run('removeCaseTags', { case_id: LIVE_CASE_ID, tags: ['soar-test'] }, [
        ok({ resources: [liveCase] }),
        ok({ resources: [{ ...liveCase, version: 5, tags: [] }] }),
      ]);
      expect(removed.calls()[1].url).toBe(
        `${BASE}/cases/entities/case-tags/v1?id=${LIVE_CASE_ID}&tag=soar-test`
      );
      expect(removed.result).toEqual({
        resources: [{ ...liveCase, version: 5, tags: [] }],
        errors: [],
        meta: undefined,
        outcomes: [{ id: 'soar-test', status: 'requested' }],
      });
    });

    it('the tag actions cap tags at 20 of 100 characters and never repeat a 502', async () => {
      expect(accepts('addCaseTags', { case_id: CASE_ID, tags: Array(21).fill('t') })).toBe(false);
      expect(accepts('addCaseTags', { case_id: CASE_ID, tags: Array(20).fill('t') })).toBe(true);
      expect(accepts('removeCaseTags', { case_id: CASE_ID, tags: ['t'.repeat(101)] })).toBe(false);
      expect(accepts('removeCaseTags', { case_id: CASE_ID, tags: [] })).toBe(false);
      const { ctx, request } = makeCtx([caseWithTags([]), fail(502, 'bad gateway')]);
      const input = action('addCaseTags').input.parse({ case_id: CASE_ID, tags: ['t'] });
      await expect(action('addCaseTags').handler(ctx, input)).rejects.toThrow(/502/);
      // One read, then one write that is not repeated.
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('removeCaseTags refuses 20 long multi-byte tags that would exceed the URL limit, before any write', async () => {
      const tags = Array.from({ length: 20 }, (_, i) => `${i}`.padStart(100, '€'));
      expect(accepts('removeCaseTags', { case_id: CASE_ID, tags })).toBe(true);
      const { ctx, request } = makeCtx([caseWithTags(tags)]);
      const input = action('removeCaseTags').input.parse({ case_id: CASE_ID, tags });
      await expect(action('removeCaseTags').handler(ctx, input)).rejects.toThrow(
        /The request URL would be \d+ bytes, over the 8000-byte limit/
      );
      // Only the case read is sent; the DELETE never leaves the connector.
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'POST',
        url: `${BASE}/cases/entities/cases/v2`,
      });
    });

    it('names the Cases scope on a 403', async () => {
      await expect(run('searchCases', {}, [fail(403, 'access denied')])).rejects.toThrow(
        'the API client needs the Cases (Case Management): Read scope'
      );
      await expect(
        run('updateCase', { case_id: CASE_ID, status: 'closed' }, [fail(403, 'access denied')])
      ).rejects.toThrow('the API client needs the Cases (Case Management): Write scope');
    });
  });

  it('falls back to the page size when Falcon reports a null total', async () => {
    const nullTotal = { pagination: { total: null } };
    const cases = await run('searchCases', {}, [
      ok({ meta: nullTotal, resources: [CASE_ID, 'case-0002'] }),
    ]);
    expect(cases.result).toMatchObject({ ids: [CASE_ID, 'case-0002'], total: 2 });
    const rules = await run('listIOARules', {}, [
      ok({ meta: nullTotal, resources: [{ id: GROUP, rules: [] }] }),
    ]);
    expect(rules.result).toMatchObject({ total: 1 });
    const exclusions = await run('searchIOAExclusions', { hydrate: false }, [
      ok({ meta: nullTotal, resources: ['ex1', 'ex2', 'ex3'] }),
    ]);
    expect(exclusions.result).toMatchObject({ ids: ['ex1', 'ex2', 'ex3'], total: 3 });
    const scan = await run('getScanResults', { scan_id: 'scan-1' }, [
      ok({ resources: [{ id: 'scan-1' }] }),
      ok({ meta: nullTotal, resources: ['mf1'] }),
      ok({ resources: [{ id: 'mf1' }] }),
    ]);
    expect(scan.result).toMatchObject({ malicious_files_total: 1 });
  });

  describe('custom IOA rules and exclusions', () => {
    it('listIOARules sends the offset as a string, a default limit of 50, and returns the groups', async () => {
      const group = { id: GROUP, version: 3, rules: [{ id: '1', instance_id: 'inst-1' }] };
      const { result, calls } = await run(
        'listIOARules',
        { filter: 'enabled:true', q: 'x', sort: 'name', offset: 50 },
        [ok({ meta: { pagination: { total: 51 } }, resources: [group] })]
      );
      expect(calls()[0].url).toBe(
        `${BASE}/ioarules/queries/rule-groups-full/v1?filter=enabled%3Atrue&q=x&sort=name&offset=50&limit=50`
      );
      expect(result).toEqual({
        rule_groups: [group],
        total: 51,
        next_offset: null,
        errors: [],
        meta: { pagination: { total: 51 } },
      });
      expect(accepts('listIOARules', { sort: 'name.asc' })).toBe(false);
      expect(accepts('listIOARules', { limit: 501 })).toBe(false);
    });

    it('createIOARule maps rule_group_id to rulegroup_id and sends no enabled field', async () => {
      const { result, calls } = await run(
        'createIOARule',
        {
          rule_group_id: GROUP,
          ruletype_id: '1',
          name: 'soar-test rule',
          pattern_severity: 'informational',
          disposition_id: 10,
          field_values: FIELD_VALUES,
        },
        [ok({ resources: [{ id: '5', instance_id: 'inst-5', enabled: false }] })]
      );
      expect(calls()[0]).toEqual({
        method: 'POST',
        url: `${BASE}/ioarules/entities/rules/v1`,
        data: {
          rulegroup_id: GROUP,
          ruletype_id: '1',
          name: 'soar-test rule',
          description: '',
          pattern_severity: 'informational',
          disposition_id: 10,
          field_values: FIELD_VALUES,
          comment: '',
        },
      });
      expect(result).toEqual({
        rule: { id: '5', instance_id: 'inst-5', enabled: false },
        errors: [],
        meta: undefined,
      });
    });

    it('createIOARule validates its required inputs and does not repeat a 500', async () => {
      const base = {
        rule_group_id: GROUP,
        ruletype_id: '1',
        name: 'r',
        pattern_severity: 'high',
        disposition_id: 10,
        field_values: FIELD_VALUES,
      };
      expect(accepts('createIOARule', base)).toBe(true);
      expect(accepts('createIOARule', { ...base, field_values: [] })).toBe(false);
      expect(
        accepts('createIOARule', { ...base, field_values: Array(51).fill(FIELD_VALUES[0]) })
      ).toBe(false);
      expect(accepts('createIOARule', { ...base, disposition_id: 1.5 })).toBe(false);
      expect(accepts('createIOARule', { ...base, rule_group_id: 'bad id' })).toBe(false);
      const { ctx, request } = makeCtx([fail(500, 'boom')]);
      await expect(
        action('createIOARule').handler(ctx, action('createIOARule').input.parse(base))
      ).rejects.toThrow('Status code: 500. Message: boom');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('updateIOARule reads the group version when it is not given and sends one rule update', async () => {
      const { result, calls } = await run(
        'updateIOARule',
        { rule_group_id: GROUP, instance_id: 'inst-5', enabled: true, comment: 'enable' },
        [
          ok({ resources: [{ id: GROUP, version: 4 }] }),
          ok({ resources: [{ instance_id: 'inst-5', enabled: true }] }),
        ]
      );
      expect(calls()).toEqual([
        {
          method: 'GET',
          url: `${BASE}/ioarules/entities/rule-groups/v1?ids=${GROUP}`,
          data: undefined,
        },
        {
          method: 'PATCH',
          url: `${BASE}/ioarules/entities/rules/v2`,
          data: {
            rulegroup_id: GROUP,
            rulegroup_version: 4,
            comment: 'enable',
            rule_updates: [{ instance_id: 'inst-5', rulegroup_version: 4, enabled: true }],
          },
        },
      ]);
      expect(result).toEqual({
        rules: [{ instance_id: 'inst-5', enabled: true }],
        errors: [],
        meta: undefined,
      });
    });

    it('updateIOARule uses a given version without reading the group, and needs one change', async () => {
      const { calls } = await run(
        'updateIOARule',
        { rule_group_id: GROUP, instance_id: 'inst-5', rulegroup_version: 9, name: 'renamed' },
        [ok({ resources: [] })]
      );
      expect(calls()).toHaveLength(1);
      expect(calls()[0].data).toMatchObject({
        rulegroup_version: 9,
        rule_updates: [{ instance_id: 'inst-5', rulegroup_version: 9, name: 'renamed' }],
      });
      expect(accepts('updateIOARule', { rule_group_id: GROUP, instance_id: 'inst-5' })).toBe(false);
    });

    it('updateIOARule fails clearly when the group has no version and reports a stale version', async () => {
      await expect(
        run('updateIOARule', { rule_group_id: GROUP, instance_id: 'i', enabled: false }, [
          ok({ resources: [] }),
        ])
      ).rejects.toThrow(/Could not read the version of custom IOA rule group/);
      await expect(
        run(
          'updateIOARule',
          { rule_group_id: GROUP, instance_id: 'i', enabled: false, rulegroup_version: 1 },
          [fail(409, 'rule group version mismatch')]
        )
      ).rejects.toThrow('Status code: 409. Message: rule group version mismatch');
    });

    it('deleteIOARule repeats ids in the query and treats a meta-only 200 as success', async () => {
      const { result, calls } = await run(
        'deleteIOARule',
        { rule_group_id: GROUP, rule_ids: ['5', '6'], comment: 'cleanup' },
        [ok({ meta: { query_time: 0.1 } })]
      );
      expect(calls()[0]).toEqual({
        method: 'DELETE',
        url: `${BASE}/ioarules/entities/rules/v1?rule_group_id=${GROUP}&ids=5&ids=6&comment=cleanup`,
        data: undefined,
      });
      expect(result).toEqual({
        deleted: true,
        ids: ['5', '6'],
        failures: [],
        meta: { query_time: 0.1 },
        outcomes: [
          { id: '5', status: 'requested' },
          { id: '6', status: 'requested' },
        ],
      });
    });

    it('deleteIOARule reports per-id failures and does not repeat a 500', async () => {
      const partial = await run('deleteIOARule', { rule_group_id: GROUP, rule_ids: ['5', '6'] }, [
        ok({ meta: {}, errors: [{ code: 404, message: 'rule 6 not found', id: '6' }] }),
      ]);
      expect(partial.result).toMatchObject({ deleted: true, ids: ['5'] });
      expect((partial.result as { outcomes: unknown }).outcomes).toEqual([
        { id: '5', status: 'requested' },
        { id: '6', status: 'notFound' },
      ]);
      const conflict = await run('deleteIOARule', { rule_group_id: GROUP, rule_ids: ['5', '6'] }, [
        ok({ meta: {}, errors: [{ code: 409, message: 'rule 6 is in use', id: '6' }] }),
      ]);
      expect((conflict.result as { outcomes: unknown }).outcomes).toEqual([
        { id: '5', status: 'requested' },
        { id: '6', status: 'failed', reason: 'rule 6 is in use' },
      ]);
      const { ctx, request } = makeCtx([fail(500, 'boom')]);
      const input = action('deleteIOARule').input.parse({ rule_group_id: GROUP, rule_ids: ['5'] });
      await expect(action('deleteIOARule').handler(ctx, input)).rejects.toThrow(/500/);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('deleteIOARule splits 100 long ids and a long comment so every URL stays under 8,000 bytes', async () => {
      const ids = Array.from({ length: 100 }, (_, i) => `${i}`.padStart(64, 'f'));
      const { result, calls } = await run('deleteIOARule', {
        rule_group_id: GROUP,
        rule_ids: ids,
        comment: 'é'.repeat(500),
      });
      expect(calls().length).toBeGreaterThan(1);
      for (const call of calls()) {
        expect(new TextEncoder().encode(call.url).length).toBeLessThanOrEqual(8000);
      }
      const sent = calls().flatMap((call) => new URL(call.url).searchParams.getAll('ids'));
      expect(sent).toEqual(ids);
      expect(result).toMatchObject({ deleted: true, ids });
      expect(
        accepts('deleteIOARule', { rule_group_id: GROUP, rule_ids: Array(101).fill('1') })
      ).toBe(false);
    });

    it('deleteIOARule keeps the ids already deleted when a later chunk fails', async () => {
      const ids = Array.from({ length: 100 }, (_, i) => `${i}`.padStart(64, 'f'));
      const { result, calls } = await run(
        'deleteIOARule',
        { rule_group_id: GROUP, rule_ids: ids, comment: 'é'.repeat(500) },
        [ok({ meta: { query_time: 0.1 } }), fail(403, 'denied')]
      );
      expect(calls()).toHaveLength(2);
      const first = new URL(calls()[0].url).searchParams.getAll('ids');
      expect(first.length).toBeGreaterThan(0);
      expect(first).toEqual(ids.slice(0, first.length));
      const rest = ids.slice(first.length);
      expect(result).toEqual({
        deleted: true,
        ids: first,
        failures: rest.map((id) => ({
          id,
          message: expect.stringMatching(
            /^Not deleted: .*the API client needs the Custom IOA rules: Write scope/
          ),
        })),
        meta: { query_time: 0.1 },
        outcomes: [
          ...first.map((id) => ({ id, status: 'requested' })),
          ...rest.map((id) => ({
            id,
            status: 'failed',
            reason: expect.stringMatching(/^Not deleted: /),
          })),
        ],
      });
    });

    it('searchIOAExclusions reads the details of the page unless hydrate is false', async () => {
      const exclusion = { id: 'ex1', name: 'backup', pattern_id: '41' };
      const { result, calls } = await run(
        'searchIOAExclusions',
        { filter: "name:'*backup*'", sort: 'name.asc' },
        [
          ok({ meta: { pagination: { total: 1 } }, resources: ['ex1'] }),
          ok({ resources: [exclusion] }),
        ]
      );
      expect(calls().map((c) => c.url)).toEqual([
        `${BASE}/exclusions/queries/ss-ioa-exclusions/v2?filter=name%3A%27*backup*%27&sort=name.asc&limit=100`,
        `${BASE}/exclusions/entities/ss-ioa-exclusions/v2?ids=ex1`,
      ]);
      expect(result).toEqual({
        exclusions: [exclusion],
        ids: ['ex1'],
        total: 1,
        next_offset: null,
        errors: [],
        meta: { pagination: { total: 1 } },
      });
      const idsOnly = await run('searchIOAExclusions', { hydrate: false }, [
        ok({ meta: { pagination: { total: 1 } }, resources: ['ex1'] }),
      ]);
      expect(idsOnly.calls()).toHaveLength(1);
      expect(idsOnly.result).toMatchObject({ exclusions: [], ids: ['ex1'] });
    });

    it('names the IOA scopes on a 403', async () => {
      await expect(run('listIOARules', {}, [fail(403, 'denied')])).rejects.toThrow(
        'the API client needs the Custom IOA rules: Read scope'
      );
      await expect(run('searchIOAExclusions', {}, [fail(403, 'denied')])).rejects.toThrow(
        'the API client needs the IOA exclusions: Read scope'
      );
    });
  });

  describe('on-demand scans', () => {
    it('createScan sends the inputs given and quarantine false by default', async () => {
      const { result, calls } = await run(
        'createScan',
        { hosts: [AID], file_paths: ['C:\\Users\\Public\\'], cpu_priority: 2, max_duration: 2 },
        [ok({ resources: [{ id: 'scan-1', status: 'pending' }] })]
      );
      expect(calls()[0]).toEqual({
        method: 'POST',
        url: `${BASE}/ods/entities/scans/v1`,
        data: {
          hosts: [AID],
          file_paths: ['C:\\Users\\Public\\'],
          cpu_priority: 2,
          max_duration: 2,
          quarantine: false,
        },
      });
      expect(result).toEqual({
        scan_id: 'scan-1',
        resources: [{ id: 'scan-1', status: 'pending' }],
        errors: [],
        meta: undefined,
      });
    });

    it('createScan needs hosts or host groups, never repeats a 500 and names the ODS scope on a 403', async () => {
      expect(accepts('createScan', {})).toBe(false);
      expect(accepts('createScan', { file_paths: ['/tmp'] })).toBe(false);
      expect(accepts('createScan', { host_groups: [GROUP] })).toBe(true);
      expect(accepts('createScan', { hosts: ['not-a-device'] })).toBe(false);
      expect(accepts('createScan', { hosts: Array(101).fill(AID) })).toBe(false);
      expect(accepts('createScan', { host_groups: Array(21).fill(GROUP) })).toBe(false);
      const { ctx, request } = makeCtx([fail(500, 'boom')]);
      const input = action('createScan').input.parse({ host_groups: [GROUP], quarantine: true });
      await expect(action('createScan').handler(ctx, input)).rejects.toThrow(/500/);
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0].data).toMatchObject({ quarantine: true });
      await expect(run('createScan', { hosts: [AID] }, [fail(403, 'denied')])).rejects.toThrow(
        'the API client needs the On-demand scans (ODS): Write scope'
      );
    });

    it('createScan sends each host once, in lowercase, and each host group once', async () => {
      const { calls } = await run(
        'createScan',
        { hosts: [AID.toUpperCase(), AID, AID2], host_groups: [GROUP, GROUP] },
        [ok({ resources: [{ id: 'scan-2' }] })]
      );
      expect(calls()[0].data).toEqual({
        hosts: [AID, AID2],
        host_groups: [GROUP],
        cpu_priority: 1,
        quarantine: false,
      });
    });

    it('createScan sends cpu_priority 1 when none is given and accepts only 1 to 5', async () => {
      const { calls } = await run('createScan', { hosts: [AID] }, [
        ok({ resources: [{ id: 's' }] }),
      ]);
      expect(calls()[0].data).toEqual({ hosts: [AID], cpu_priority: 1, quarantine: false });
      expect(calls()[0].data).not.toHaveProperty('initiated_from');
      for (const level of [1, 3, 5]) {
        const sent = await run('createScan', { hosts: [AID], cpu_priority: level }, [
          ok({ resources: [{ id: 's' }] }),
        ]);
        expect(sent.calls()[0].data).toMatchObject({ cpu_priority: level });
      }
      for (const level of [0, 6, -1, 2.5]) {
        expect(accepts('createScan', { hosts: [AID], cpu_priority: level })).toBe(false);
      }
    });

    it('createScan keeps pause_duration at most max_duration', async () => {
      const result = action('createScan').input.safeParse({
        hosts: [AID],
        max_duration: 1,
        pause_duration: 2,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['pause_duration'],
        message: 'pause_duration must be less than or equal to max_duration.',
      });
      expect(accepts('createScan', { hosts: [AID], max_duration: 3, pause_duration: 3 })).toBe(
        true
      );
      const short = await run('createScan', { hosts: [AID], max_duration: 1 }, [
        ok({ resources: [{ id: 's' }] }),
      ]);
      expect(short.calls()[0].data).toMatchObject({ max_duration: 1, pause_duration: 1 });
      const none = await run('createScan', { hosts: [AID], max_duration: 0 }, [
        ok({ resources: [{ id: 's' }] }),
      ]);
      expect(none.calls()[0].data).toMatchObject({ max_duration: 0, pause_duration: 0 });
      const atDefault = await run('createScan', { hosts: [AID], max_duration: 2 }, [
        ok({ resources: [{ id: 's' }] }),
      ]);
      expect(atDefault.calls()[0].data).not.toHaveProperty('pause_duration');
      const given = await run('createScan', { hosts: [AID], max_duration: 4, pause_duration: 3 }, [
        ok({ resources: [{ id: 's' }] }),
      ]);
      expect(given.calls()[0].data).toMatchObject({ max_duration: 4, pause_duration: 3 });
    });

    it('createScan refuses a wildcard in file_paths but keeps glob patterns in scan_exclusions', () => {
      const result = action('createScan').input.safeParse({
        hosts: [AID],
        file_paths: ['C:\\Users\\Public\\', 'C:\\Users\\Public\\*'],
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['file_paths', 1],
        message:
          'file_paths are folders or files without wildcards (*): Falcon rejects them as invalid path characters.',
      });
      expect(accepts('createScan', { hosts: [AID], file_paths: ['C:\\Users\\Public\\'] })).toBe(
        true
      );
      expect(accepts('createScan', { hosts: [AID], file_paths: ['/home/user/Downloads'] })).toBe(
        true
      );
      expect(
        accepts('createScan', {
          hosts: [AID],
          file_paths: ['C:\\Users\\Public\\'],
          scan_exclusions: ['**\\*.iso'],
        })
      ).toBe(true);
    });

    it('getScanResults reads the scan, then the malicious files of the scan', async () => {
      const file = { id: 'mf1', filename: 'evil.exe', hash: SHA, quarantined: false };
      const { result, calls } = await run('getScanResults', { scan_id: 'scan-1', limit: 1 }, [
        ok({ resources: [{ id: 'scan-1', status: 'completed' }] }),
        ok({ meta: { pagination: { total: 2 } }, resources: ['mf1'] }),
        ok({ resources: [file] }),
      ]);
      expect(calls().map((c) => c.url)).toEqual([
        `${BASE}/ods/entities/scans/v1?ids=scan-1`,
        `${BASE}/ods/queries/malicious-files/v1?filter=scan_id%3A%27scan-1%27&limit=1`,
        `${BASE}/ods/entities/malicious-files/v1?ids=mf1`,
      ]);
      expect(result).toEqual({
        scan: { id: 'scan-1', status: 'completed' },
        malicious_files: [file],
        malicious_files_total: 2,
        next_offset: 1,
        errors: [],
        meta: undefined,
      });
    });

    it('getScanResults skips the file calls when include_files is false or nothing was found', async () => {
      const noFiles = await run('getScanResults', { scan_id: 'scan-1', include_files: false }, [
        ok({ resources: [{ id: 'scan-1' }] }),
      ]);
      expect(noFiles.calls()).toHaveLength(1);
      expect(noFiles.result).toMatchObject({ malicious_files: [], malicious_files_total: null });
      const clean = await run('getScanResults', { scan_id: 'scan-1' }, [
        ok({ resources: [{ id: 'scan-1' }] }),
        ok({ meta: { pagination: { total: 0 } }, resources: [] }),
      ]);
      expect(clean.calls()).toHaveLength(2);
      expect(clean.result).toMatchObject({ malicious_files: [], malicious_files_total: 0 });
    });

    it('getScanResults refuses a scan id that could change the filter, and reports an unknown scan', async () => {
      expect(accepts('getScanResults', { scan_id: "x'+scan_id:'y" })).toBe(false);
      expect(accepts('getScanResults', { scan_id: 'a'.repeat(65) })).toBe(false);
      await expect(
        run('getScanResults', { scan_id: 'missing' }, [fail(404, 'scan not found')])
      ).rejects.toThrow('Status code: 404. Message: scan not found');
    });
  });
});
