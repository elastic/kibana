/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ActionContext } from '../../connector_spec';
import { MicrosoftDefenderForEndpoint } from './microsoft_defender_for_endpoint';

const notFound = (data: unknown) =>
  Object.assign(new Error('Request failed with status code 404'), {
    isAxiosError: true,
    response: { status: 404, data, headers: {}, statusText: '' },
  });

const noDevices = notFound({ error: { code: 'ResourceNotFound', message: 'No devices' } });
const wrongPath = notFound('<html>Not Found</html>');

const createContext = (error: unknown) =>
  ({
    client: { request: jest.fn().mockRejectedValue(error) },
    config: { apiUrl: 'https://api.securitycenter.microsoft.com/api' },
    secrets: { authType: 'oauth_client_credentials' },
    log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
  } as unknown as ActionContext);

describe('MicrosoftDefenderForEndpoint', () => {
  it('should be defined', () => {
    expect(MicrosoftDefenderForEndpoint).toBeDefined();
  });

  it('exposes exactly the actions of the V2 scope (issue #304735)', () => {
    expect(Object.keys(MicrosoftDefenderForEndpoint.actions).sort()).toEqual(
      [
        // Carried over from the V1 connector
        'getAgentList',
        'getAgentDetails',
        'isolateHost',
        'releaseHost',
        'runScript',
        'getLibraryFiles',
        'getActions',
        'getActionResults',
        'cancelAction',
        // Net-new: must have
        'runAntivirusScan',
        'submitIndicator',
        'listIndicators',
        'deleteIndicator',
        // Net-new: should have
        'collectInvestigationPackage',
        'getInvestigationUri',
        'stopAndQuarantineFile',
        'getFileInfo',
        'getFile',
        'restrictAppExecution',
        'removeAppRestriction',
        'updateMachineTag',
        // startInvestigation is not built: Microsoft retired manual AIR triggering (Sept 2026).
        'getFileDevices',
        'getUserDevices',
        'getDomainDevices',
        'getFilePrevalence',
        'getIpPrevalence',
        'getDomainPrevalence',
        'getMachineUsers',
        // Net-new: nice to have
        'batchSubmitIndicators',
        'batchDeleteIndicators',
        'getDeviceAvHealth',
        'listVulnerabilities',
      ].sort()
    );
  });

  it('never points agents at an action that is not an agent tool', () => {
    const { actions, skill } = MicrosoftDefenderForEndpoint;
    const nonTools = Object.entries(actions)
      .filter(([, action]) => !action.isTool)
      .map(([name]) => name);
    expect(nonTools.sort()).toEqual(
      ['batchDeleteIndicators', 'batchSubmitIndicators', 'deleteIndicator', 'runScript'].sort()
    );

    const agentVisibleTexts: Array<[string, string]> = [
      ['skill', skill ?? ''],
      ...Object.entries(actions)
        .filter(([, action]) => action.isTool)
        .map(([name, action]): [string, string] => [
          name,
          `${action.description ?? ''} ${JSON.stringify(z.toJSONSchema(action.input))}`,
        ]),
    ];
    const mentions = agentVisibleTexts.flatMap(([where, text]) =>
      nonTools
        .filter((name) => new RegExp(`\\b${name}\\b`).test(text))
        .map((name) => `${where} mentions ${name}`)
    );
    expect(mentions).toEqual([]);
  });

  describe('test handler', () => {
    const runTest = (ctx: ActionContext) => {
      const { test } = MicrosoftDefenderForEndpoint;
      if (!test) {
        throw new Error('the connector defines no test handler');
      }
      return test.handler(ctx);
    };

    it('passes when the tenant has no recent devices (404 ResourceNotFound)', async () => {
      await expect(runTest(createContext(noDevices))).resolves.toEqual({
        message: 'Connected to the Microsoft Defender for Endpoint API.',
      });
    });

    it('fails on a 404 without ResourceNotFound, such as a wrong API URL path', async () => {
      await expect(runTest(createContext(wrongPath))).rejects.toThrow(/HTTP 404/);
    });
  });

  describe('getAgentList', () => {
    const { handler } = MicrosoftDefenderForEndpoint.actions.getAgentList;

    it('returns an empty page when the tenant has no recent devices', async () => {
      await expect(handler(createContext(noDevices), {})).resolves.toEqual({
        value: [],
        count: 0,
        hasMore: false,
      });
    });

    it('fails on a 404 without ResourceNotFound', async () => {
      await expect(handler(createContext(wrongPath), {})).rejects.toThrow(/HTTP 404/);
    });
  });

  describe('user and device lookups', () => {
    const { actions } = MicrosoftDefenderForEndpoint;
    const okContext = () => {
      const request = jest.fn().mockResolvedValue({ data: { value: [] } });
      return {
        request,
        ctx: {
          client: { request },
          config: { apiUrl: 'https://api.securitycenter.microsoft.com/api' },
          secrets: {},
          log: { debug: jest.fn(), warn: jest.fn() },
        } as unknown as ActionContext,
      };
    };

    it('getMachineUsers accepts a computer name as well as a device ID', async () => {
      const { ctx, request } = okContext();
      const input = actions.getMachineUsers.input.parse({ machineId: 'c-lab-12' });

      await actions.getMachineUsers.handler(ctx, input);
      expect(request.mock.calls[0][0].url).toBe(
        'https://api.securitycenter.microsoft.com/api/machines/c-lab-12/logonusers'
      );
      expect(() => actions.getMachineUsers.input.parse({ machineId: 'bad name' })).toThrow();
    });

    it('getUserDevices accepts a user name with spaces and URL-encodes it', async () => {
      const { ctx, request } = okContext();
      const input = actions.getUserDevices.input.parse({ user: ' CONTOSO\\John Doe ' });

      await actions.getUserDevices.handler(ctx, input);
      expect(request.mock.calls[0][0].url).toBe(
        'https://api.securitycenter.microsoft.com/api/users/John%20Doe/machines'
      );
      expect(() => actions.getUserDevices.input.parse({ user: 'john/doe' })).toThrow();
      expect(() => actions.getUserDevices.input.parse({ user: 'john\ndoe' })).toThrow();
      expect(() => actions.getUserDevices.input.parse({ user: '   ' })).toThrow();
    });
  });

  describe('listIndicators', () => {
    const { handler } = MicrosoftDefenderForEndpoint.actions.listIndicators;
    const noIndicators = notFound({
      error: { code: 'ResourceNotFound', message: 'No indicators' },
    });

    it('returns an empty page when the API answers 404 ResourceNotFound', async () => {
      await expect(handler(createContext(noIndicators), {})).resolves.toEqual({
        value: [],
        count: 0,
        hasMore: false,
      });
    });

    it('fails on a 404 without ResourceNotFound', async () => {
      await expect(handler(createContext(wrongPath), {})).rejects.toThrow(/HTTP 404/);
    });

    it('names the indicator permissions in a 403 error', async () => {
      const forbidden = Object.assign(new Error('Request failed with status code 403'), {
        isAxiosError: true,
        response: { status: 403, data: {}, headers: {}, statusText: '' },
      });
      await expect(handler(createContext(forbidden), {})).rejects.toThrow(/Ti\.ReadWrite\.All/);
    });
  });

  describe('indicator batches', () => {
    const { actions } = MicrosoftDefenderForEndpoint;
    const indicator = {
      indicatorValue: '192.0.2.10',
      indicatorType: 'IpAddress',
      action: 'Block',
      title: 't',
      description: 'd',
    };
    const okContext = (data: unknown) => {
      const request = jest.fn().mockResolvedValue({ data });
      return {
        request,
        ctx: {
          client: { request },
          config: { apiUrl: 'https://api.securitycenter.microsoft.com/api' },
          secrets: { authType: 'oauth_client_credentials' },
          log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
        } as unknown as ActionContext,
      };
    };

    it('batchSubmitIndicators posts to /indicators/import and counts failures', async () => {
      const value = [
        { id: '1', indicator: '192.0.2.10', isFailed: false, failureReason: null },
        { id: null, indicator: '192.0.2.11', isFailed: true, failureReason: 'bad' },
      ];
      const { ctx, request } = okContext({ value });
      const input = actions.batchSubmitIndicators.input.parse({
        indicators: [indicator, { ...indicator, indicatorValue: '192.0.2.11' }],
      });

      await expect(actions.batchSubmitIndicators.handler(ctx, input)).resolves.toEqual({
        value,
        count: 2,
        failedCount: 1,
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'POST',
        url: 'https://api.securitycenter.microsoft.com/api/indicators/import',
        data: { Indicators: [indicator, { ...indicator, indicatorValue: '192.0.2.11' }] },
      });
    });

    it('accepts only IPv4 for IP indicators and IP prevalence, since the API rejects IPv6', () => {
      expect(() => actions.submitIndicator.input.parse(indicator)).not.toThrow();
      expect(() =>
        actions.submitIndicator.input.parse({ ...indicator, indicatorValue: '2001:db8::13' })
      ).toThrow(/IPv4 address; IPv6/);
      expect(() => actions.getIpPrevalence.input.parse({ ip: '8.8.8.8' })).not.toThrow();
      expect(() => actions.getIpPrevalence.input.parse({ ip: '2001:4860:4860::8888' })).toThrow(
        /IPv4/
      );
      // getAgentList only filters on the address a device reported, so it keeps IPv6.
      expect(() =>
        actions.getAgentList.input.parse({ ipAddress: '2001:4860:4860::8888' })
      ).not.toThrow();
    });

    it('batchSubmitIndicators validates each indicator and the batch size', () => {
      expect(() =>
        actions.batchSubmitIndicators.input.parse({
          indicators: [{ ...indicator, indicatorValue: '10.0.0.0/8' }],
        })
      ).toThrow(/CIDR/);
      expect(() => actions.batchSubmitIndicators.input.parse({ indicators: [] })).toThrow();
      expect(() =>
        actions.batchSubmitIndicators.input.parse({ indicators: Array(501).fill(indicator) })
      ).toThrow();
    });

    it('accepts educateUrl only on a Url indicator with action Block or Warn', () => {
      const url = { ...indicator, indicatorType: 'Url', indicatorValue: 'https://bad.example' };
      expect(() =>
        actions.submitIndicator.input.parse({ ...url, action: 'Warn', educateUrl: 'https://help' })
      ).not.toThrow();
      expect(() =>
        actions.submitIndicator.input.parse({ ...indicator, educateUrl: 'https://help' })
      ).toThrow(/educateUrl is only allowed/);
      expect(() =>
        actions.submitIndicator.input.parse({
          ...url,
          action: 'Allowed',
          educateUrl: 'https://help',
        })
      ).toThrow(/educateUrl is only allowed/);
    });

    it('rejects the legacy Alert and AlertAndBlock actions, naming the action to use instead', () => {
      const actionMessages = (schema: typeof actions.submitIndicator.input, input: unknown) =>
        schema.safeParse(input).error?.issues.map((issue) => issue.message) ?? [];

      expect(
        actionMessages(actions.submitIndicator.input, { ...indicator, action: 'Alert' })
      ).toEqual([
        '"Alert" is a retired action: use action "Audit" with generateAlert true, which is what Microsoft converts it to.',
      ]);
      expect(
        actionMessages(actions.submitIndicator.input, { ...indicator, action: 'AlertAndBlock' })
      ).toEqual([
        '"AlertAndBlock" is a retired action: use action "Block" with generateAlert true (Microsoft converts it to that, or to "BlockAndRemediate" with generateAlert true for file hashes).',
      ]);
      expect(
        actionMessages(actions.batchSubmitIndicators.input, {
          indicators: [{ ...indicator, action: 'Alert' }],
        })[0]
      ).toMatch(/^"Alert" is a retired action/);
      // Any other unknown action keeps the standard message listing the valid values.
      expect(
        actionMessages(actions.submitIndicator.input, { ...indicator, action: 'Quarantine' })[0]
      ).toMatch(/expected one of "Audit"\|"Warn"\|"Block"\|"BlockAndRemediate"\|"Allowed"/);
    });

    it('batchDeleteIndicators posts the IDs as strings', async () => {
      const { ctx, request } = okContext('');
      const input = actions.batchDeleteIndicators.input.parse({ indicatorIds: [995, '996'] });

      await expect(actions.batchDeleteIndicators.handler(ctx, input)).resolves.toEqual({
        deleted: true,
        ids: ['995', '996'],
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'POST',
        url: 'https://api.securitycenter.microsoft.com/api/indicators/BatchDelete',
        data: { IndicatorIds: ['995', '996'] },
      });
    });
  });

  describe('listVulnerabilities', () => {
    const { listVulnerabilities } = MicrosoftDefenderForEndpoint.actions;
    const ctxWith = (data: unknown) => {
      const request = jest.fn().mockResolvedValue({ data });
      return {
        request,
        ctx: {
          client: { request },
          config: { apiUrl: 'https://api.securitycenter.microsoft.com/api' },
          secrets: { authType: 'oauth_client_credentials' },
          log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
        } as unknown as ActionContext,
      };
    };

    it('pages /vulnerabilities with a filter, sorted by id', async () => {
      const { ctx, request } = ctxWith({ value: [{ id: 'CVE-2024-0001' }] });
      await listVulnerabilities.handler(
        ctx,
        listVulnerabilities.input.parse({ filter: "severity eq 'Critical'", top: 10 })
      );
      expect(request.mock.calls[0][0]).toMatchObject({
        url: 'https://api.securitycenter.microsoft.com/api/vulnerabilities',
        params: { $filter: "severity eq 'Critical'", $top: 10, $orderby: 'id' },
      });
    });

    it('pages the vulnerabilities of one software, sorted by id', async () => {
      const { ctx, request } = ctxWith({
        value: [{ id: 'CVE-2024-0001' }, { id: 'CVE-2024-0002' }],
      });
      await expect(
        listVulnerabilities.handler(
          ctx,
          listVulnerabilities.input.parse({ softwareId: 'microsoft-_-edge', top: 2, skip: 4 })
        )
      ).resolves.toEqual({
        value: [{ id: 'CVE-2024-0001' }, { id: 'CVE-2024-0002' }],
        count: 2,
        hasMore: true,
        nextSkip: 6,
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        url: 'https://api.securitycenter.microsoft.com/api/Software/microsoft-_-edge/vulnerabilities',
        params: { $top: 2, $skip: 4, $orderby: 'id' },
      });
    });

    it('rejects softwareId with a filter, and a top over 500', () => {
      expect(() =>
        listVulnerabilities.input.parse({
          softwareId: 'microsoft-_-edge',
          filter: "severity eq 'High'",
        })
      ).toThrow(/cannot be combined with filter/);
      expect(() => listVulnerabilities.input.parse({ top: 501 })).toThrow();
      expect(listVulnerabilities.input.parse({ top: 500 })).toEqual({ top: 500 });
    });
  });
});
