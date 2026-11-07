/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { ConnectorSpec } from '@kbn/connector-specs';
import {
  createConnector,
  detectKibana,
  executeConnector,
  KibanaRequestError,
  listConnectors,
  updateConnector,
} from '../create_connectors/kibana_client';
import { loadManifests, resolveManifestSecrets } from '../create_connectors/manifest_loader';
import { loadFixtures } from './fixture_loader';
import { runCanaries, validateCase } from './run_canaries';
import type { FixtureCase, FixtureFile } from './types';

jest.mock('../create_connectors/kibana_client', () => ({
  ...jest.requireActual('../create_connectors/kibana_client'),
  detectKibana: jest.fn(),
  listConnectors: jest.fn(),
  createConnector: jest.fn(),
  updateConnector: jest.fn(),
  executeConnector: jest.fn(),
}));
jest.mock('../create_connectors/manifest_loader');
jest.mock('./fixture_loader');
jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
  TEST_CONNECTOR_SUB_ACTION: '_test',
}));

const detectKibanaMock = detectKibana as jest.Mock;
const listConnectorsMock = listConnectors as jest.Mock;
const createConnectorMock = createConnector as jest.Mock;
const updateConnectorMock = updateConnector as jest.Mock;
const executeConnectorMock = executeConnector as jest.Mock;
const loadManifestsMock = loadManifests as jest.Mock;
const resolveSecretsMock = resolveManifestSecrets as jest.Mock;
const loadFixturesMock = loadFixtures as jest.Mock;
const getConnectorSpecMock = getConnectorSpec as jest.Mock;

const passingSchema = { safeParse: () => ({ success: true }) };
const failingSchema = {
  safeParse: () => ({
    success: false,
    error: { issues: [{ path: ['query'], message: 'Required' }] },
  }),
};

const makeActions = (
  actions: Record<string, { scope: string; input?: unknown; output?: unknown }>
): ConnectorSpec =>
  Object.fromEntries(
    Object.entries(actions).map(([name, def]) => [name, { input: passingSchema, ...def }])
  ) as unknown as ConnectorSpec;

const specWith = (
  actions: Record<string, { scope: string; input?: unknown; output?: unknown }>,
  testEnabled = false
) =>
  ({
    metadata: { id: '.fake' },
    actions: makeActions(actions),
    test: { enabled: testEnabled },
  } as unknown as ConnectorSpec);

const caseFor = (overrides: Partial<FixtureCase> = {}): FixtureCase => ({
  action: 'getMe',
  input: {},
  expect: [{ path: 'login', type: 'string' }],
  ...overrides,
});

const fixtureFile = (cases: FixtureCase[]): FixtureFile => ({ spec_id: '.fake', cases });

const manifest = {
  spec_id: '.fake',
  name: 'Fake (testing)',
  auth_type: 'bearer',
  secrets: { token: { value: 'x' } },
};

const connection = { url: 'http://localhost:5601', auth: 'elastic:changeme' };
const log = new ToolingLog();

describe('validateCase', () => {
  const spec = specWith({
    getMe: { scope: 'read' },
    search: { scope: 'read', input: failingSchema },
    createIssue: { scope: 'write' },
  });

  it('accepts a read action with valid input', () => {
    expect(validateCase(spec, caseFor())).toBeUndefined();
  });

  it('rejects an unknown action as a fixture problem', () => {
    expect(validateCase(spec, caseFor({ action: 'nope' }))).toMatchObject({
      outcome: 'fixture',
      reason: expect.stringContaining('unknown action'),
    });
  });

  it.each(['write', 'destroy'])('rejects a %s-scope action', (scope) => {
    const result = validateCase(specWith({ doIt: { scope } }), caseFor({ action: 'doIt' }));
    expect(result).toMatchObject({ outcome: 'fixture', reason: expect.stringContaining(scope) });
  });

  it('accepts the reserved _test action when the spec enables its connection test', () => {
    const withTest = specWith({}, true);
    expect(validateCase(withTest, caseFor({ action: '_test' }))).toBeUndefined();
  });

  it('rejects _test as an unknown action when the spec has no connection test', () => {
    expect(validateCase(specWith({}), caseFor({ action: '_test' }))).toMatchObject({
      outcome: 'fixture',
      reason: expect.stringContaining('unknown action'),
    });
  });

  it('rejects input that does not match the action schema, naming the field', () => {
    expect(validateCase(spec, caseFor({ action: 'search' }))).toMatchObject({
      outcome: 'fixture',
      reason: expect.stringContaining('query: Required'),
    });
  });
});

describe('runCanaries', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    detectKibanaMock.mockResolvedValue(connection);
    listConnectorsMock.mockResolvedValue([]);
    loadManifestsMock.mockReturnValue([manifest]);
    resolveSecretsMock.mockResolvedValue({
      specId: '.fake',
      name: 'Fake (testing)',
      authType: 'bearer',
      config: {},
      secrets: { authType: 'bearer', token: 'x' },
    });
    createConnectorMock.mockResolvedValue({ id: 'new-id', name: 'Fake (testing)' });
    getConnectorSpecMock.mockReturnValue(specWith({ getMe: { scope: 'read' } }));
    loadFixturesMock.mockReturnValue([fixtureFile([caseFor()])]);
  });

  it('creates the connector, executes the case, and reports ok when the shape matches', async () => {
    executeConnectorMock.mockResolvedValue({
      connector_id: 'new-id',
      status: 'ok',
      data: { login: 'octocat' },
    });

    const results = await runCanaries({ log, dryRun: false });

    expect(createConnectorMock).toHaveBeenCalledTimes(1);
    expect(executeConnectorMock).toHaveBeenCalledWith(connection, 'new-id', {
      subAction: 'getMe',
      subActionParams: {},
    });
    expect(results).toEqual([expect.objectContaining({ outcome: 'ok', action: 'getMe' })]);
  });

  it('reuses an existing connector and re-syncs its secrets instead of creating one', async () => {
    listConnectorsMock.mockResolvedValue([
      { id: 'existing-id', name: 'Fake (testing)', connector_type_id: '.fake' },
    ]);
    updateConnectorMock.mockResolvedValue({ id: 'existing-id', name: 'Fake (testing)' });
    executeConnectorMock.mockResolvedValue({
      connector_id: 'x',
      status: 'ok',
      data: { login: 'a' },
    });

    await runCanaries({ log, dryRun: false });

    expect(createConnectorMock).not.toHaveBeenCalled();
    expect(updateConnectorMock).toHaveBeenCalledWith(connection, 'existing-id', {
      name: 'Fake (testing)',
      config: {},
      secrets: { authType: 'bearer', token: 'x' },
    });
    expect(executeConnectorMock).toHaveBeenCalledWith(connection, 'existing-id', expect.anything());
  });

  it('reports misc and does not execute when re-syncing an existing connector fails', async () => {
    listConnectorsMock.mockResolvedValue([
      { id: 'existing-id', name: 'Fake (testing)', connector_type_id: '.fake' },
    ]);
    updateConnectorMock.mockRejectedValue(new Error('Failed to update connector (HTTP 500)'));

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result.outcome).toBe('misc');
    expect(executeConnectorMock).not.toHaveBeenCalled();
  });

  it('runs every fixture file and returns results in fixture order', async () => {
    loadFixturesMock.mockReturnValue([
      fixtureFile([caseFor()]),
      { spec_id: '.other', cases: [caseFor({ action: 'search' })] },
    ]);
    getConnectorSpecMock.mockReturnValue(
      specWith({ getMe: { scope: 'read' }, search: { scope: 'read' } })
    );
    loadManifestsMock.mockReturnValue([
      manifest,
      { ...manifest, spec_id: '.other', name: 'Other' },
    ]);
    executeConnectorMock.mockImplementation(async (_conn, id, params) => {
      // The first fixture finishes last, to show that the returned results stay in fixture order.
      if (params.subAction === 'getMe') await new Promise((resolve) => setTimeout(resolve, 20));
      return { connector_id: id, status: 'ok', data: { login: 'a' } };
    });

    const results = await runCanaries({ log, dryRun: false });

    expect(results.map((r) => r.specId)).toEqual(['.fake', '.other']);
    expect(results.every((r) => r.outcome === 'ok')).toBe(true);
  });

  it('prints each fixture as soon as it finishes, without waiting for the slower ones', async () => {
    loadFixturesMock.mockReturnValue([
      fixtureFile([caseFor()]),
      { spec_id: '.other', cases: [caseFor({ action: 'search' })] },
    ]);
    getConnectorSpecMock.mockReturnValue(
      specWith({ getMe: { scope: 'read' }, search: { scope: 'read' } })
    );
    loadManifestsMock.mockReturnValue([
      manifest,
      { ...manifest, spec_id: '.other', name: 'Other' },
    ]);
    // Both promises are created before the run starts, so the test waits on events, not on timers.
    let releaseSlow: () => void = () => {};
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    executeConnectorMock.mockImplementation(async (_conn, id, params) => {
      if (params.subAction === 'getMe') await slowGate;
      return { connector_id: id, status: 'ok', data: { login: 'a' } };
    });
    const printed: string[] = [];
    let onFastPrinted: () => void = () => {};
    const fastPrinted = new Promise<void>((resolve) => {
      onFastPrinted = resolve;
    });
    const recordingLog = new ToolingLog();
    jest.spyOn(recordingLog, 'info').mockImplementation((...args) => {
      const line = String(args[0]);
      printed.push(line);
      if (line.includes('search')) onFastPrinted();
      return true;
    });

    const pending = runCanaries({ log: recordingLog, dryRun: false });
    await fastPrinted;
    expect(printed.some((line) => line.includes('getMe'))).toBe(false);

    releaseSlow();
    await pending;
    expect(printed.some((line) => line.includes('getMe'))).toBe(true);
  });

  it('fails every case of a fixture whose spec lookup throws, keeping other fixtures', async () => {
    loadFixturesMock.mockReturnValue([
      fixtureFile([caseFor(), caseFor({ name: 'second' })]),
      { spec_id: '.other', cases: [caseFor()] },
    ]);
    loadManifestsMock.mockReturnValue([
      manifest,
      { ...manifest, spec_id: '.other', name: 'Other' },
    ]);
    getConnectorSpecMock.mockImplementation((id: string) => {
      if (id === '.fake') throw new Error('spec exploded');
      return specWith({ getMe: { scope: 'read' } });
    });
    executeConnectorMock.mockResolvedValue({
      connector_id: 'x',
      status: 'ok',
      data: { login: 'a' },
    });

    const results = await runCanaries({ log, dryRun: false });

    expect(results.map((r) => [r.specId, r.outcome])).toEqual([
      ['.fake', 'misc'],
      ['.fake', 'misc'],
      ['.other', 'ok'],
    ]);
    expect(results[0].reason).toContain('spec exploded');
  });

  it('fails only the case that hits an unexpected error, not the rest of its fixture', async () => {
    loadFixturesMock.mockReturnValue([
      fixtureFile([caseFor({ name: 'first' }), caseFor({ name: 'second' })]),
    ]);
    // `executeCase` classifies thrown execute errors itself, so the unexpected one comes from output parsing.
    getConnectorSpecMock.mockReturnValue(
      specWith({
        getMe: {
          scope: 'read',
          output: {
            safeParse: jest
              .fn()
              .mockImplementationOnce(() => {
                throw new Error('schema exploded');
              })
              .mockReturnValue({ success: true }),
          },
        },
      })
    );
    executeConnectorMock.mockResolvedValue({
      connector_id: 'x',
      status: 'ok',
      data: { login: 'a' },
    });

    const results = await runCanaries({ log, dryRun: false });

    expect(results.map((r) => r.outcome)).toEqual(['misc', 'ok']);
    expect(results[0].reason).toContain('schema exploded');
  });

  it('runs the _test sub-action and checks the response root with a $ path', async () => {
    getConnectorSpecMock.mockReturnValue(specWith({}, true));
    loadFixturesMock.mockReturnValue([
      fixtureFile([caseFor({ action: '_test', expect: [{ path: '$', type: 'object' }] })]),
    ]);
    executeConnectorMock.mockResolvedValue({ connector_id: 'x', status: 'ok', data: {} });

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result.outcome).toBe('ok');
    expect(executeConnectorMock).toHaveBeenCalledWith(
      connection,
      'new-id',
      expect.objectContaining({ subAction: '_test' })
    );
  });

  it('classifies an ok response with the wrong shape as a test failure', async () => {
    executeConnectorMock.mockResolvedValue({ connector_id: 'x', status: 'ok', data: { login: 1 } });

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result).toMatchObject({
      outcome: 'test',
      reason: expect.stringContaining('"login" is number (expected string)'),
    });
  });

  it('classifies an ok response failing the action output schema as a test failure', async () => {
    getConnectorSpecMock.mockReturnValue(
      specWith({ getMe: { scope: 'read', output: failingSchema } })
    );
    executeConnectorMock.mockResolvedValue({
      connector_id: 'x',
      status: 'ok',
      data: { login: 'a' },
    });

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result).toMatchObject({
      outcome: 'test',
      reason: expect.stringContaining('output schema'),
    });
  });

  it('classifies a 401 from the vendor as an auth failure', async () => {
    executeConnectorMock.mockResolvedValue({
      connector_id: 'x',
      status: 'error',
      message: 'Unauthorized',
      error_meta: { statusCode: 401 },
    });

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result.outcome).toBe('auth');
  });

  it('classifies a 5xx from the vendor as an error', async () => {
    executeConnectorMock.mockResolvedValue({
      connector_id: 'x',
      status: 'error',
      message: 'Bad gateway',
      error_meta: { statusCode: 502 },
    });

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result.outcome).toBe('error');
  });

  it('classifies a timeout as misc', async () => {
    executeConnectorMock.mockRejectedValue(new Error('Request timed out after 60000ms'));

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result.outcome).toBe('misc');
  });

  it('classifies a Kibana 400 as a fixture problem', async () => {
    executeConnectorMock.mockRejectedValue(new KibanaRequestError('Invalid params', 400));

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result.outcome).toBe('fixture');
  });

  it('does not create a connector or execute when every case is an invalid fixture', async () => {
    loadFixturesMock.mockReturnValue([fixtureFile([caseFor({ action: 'nope' })])]);

    const results = await runCanaries({ log, dryRun: false });

    expect(results).toEqual([expect.objectContaining({ outcome: 'fixture' })]);
    expect(resolveSecretsMock).not.toHaveBeenCalled();
    expect(executeConnectorMock).not.toHaveBeenCalled();
  });

  it('reports misc for every case when the connector cannot be set up, with a vault hint', async () => {
    loadFixturesMock.mockReturnValue([fixtureFile([caseFor(), caseFor({ name: 'second' })])]);
    resolveSecretsMock.mockRejectedValue(new Error('Failed to read secret from vault: denied'));

    const results = await runCanaries({ log, dryRun: false });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.outcome === 'misc')).toBe(true);
    expect(results[0].reason).toContain('vault login');
    expect(resolveSecretsMock).toHaveBeenCalledTimes(1);
    expect(executeConnectorMock).not.toHaveBeenCalled();
  });

  it('caps a very long setup error so one case stays on one readable line', async () => {
    resolveSecretsMock.mockRejectedValue(
      new Error(`Failed to update connector: ${'x'.repeat(2000)}`)
    );
    const [result] = await runCanaries({ log, dryRun: false });
    expect(result.reason?.length).toBeLessThan(450);
    expect(result.reason).toContain('…');
  });

  it('still hints about vault when the mention is past the length cap', async () => {
    resolveSecretsMock.mockRejectedValue(new Error(`${'x'.repeat(400)} vault`));
    const [result] = await runCanaries({ log, dryRun: false });
    expect(result.reason).toContain('vault login');
  });

  it('does not split an emoji at the length cap', async () => {
    resolveSecretsMock.mockRejectedValue(new Error(`${'x'.repeat(299)}😀 and more text after it`));
    const [result] = await runCanaries({ log, dryRun: false });
    expect(result.reason).toContain('😀…');
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(result.reason ?? '')).toBe(false);
  });

  it('keeps Vault output in the reason but not the how-to text, and hints on any capitalisation', async () => {
    resolveSecretsMock.mockRejectedValue(
      new Error(
        [
          'Failed to read secret from vault (path: p, field: f).',
          'Vault output: permission denied',
          '',
          'Make sure you are logged in:',
        ].join('\n')
      )
    );
    const [first] = await runCanaries({ log, dryRun: false });
    expect(first.reason).toContain('Vault output: permission denied');
    expect(first.reason).not.toContain('Make sure you are logged in');

    resolveSecretsMock.mockRejectedValue(new Error('Vault returned an empty value for path: p'));
    const [second] = await runCanaries({ log, dryRun: false });
    expect(second.reason).toContain('vault login');
  });

  it('reports a fixture problem when no enabled manifest matches the spec', async () => {
    loadManifestsMock.mockReturnValue([{ ...manifest, enabled: false }]);

    const [result] = await runCanaries({ log, dryRun: false });

    expect(result).toMatchObject({
      outcome: 'fixture',
      reason: expect.stringContaining('no enabled manifest'),
    });
  });

  it('skips disabled cases', async () => {
    loadFixturesMock.mockReturnValue([fixtureFile([caseFor({ enabled: false })])]);

    expect(await runCanaries({ log, dryRun: false })).toEqual([]);
    expect(executeConnectorMock).not.toHaveBeenCalled();
  });

  it('validates fixtures without touching Kibana or Vault on a dry run', async () => {
    const results = await runCanaries({ log, dryRun: true });

    expect(results).toEqual([expect.objectContaining({ outcome: 'ok', reason: 'dry run' })]);
    expect(detectKibanaMock).not.toHaveBeenCalled();
    expect(resolveSecretsMock).not.toHaveBeenCalled();
    expect(executeConnectorMock).not.toHaveBeenCalled();
  });

  it('filters fixtures with --only, with or without the leading dot', async () => {
    loadFixturesMock.mockReturnValue([
      fixtureFile([caseFor()]),
      { spec_id: '.other', cases: [caseFor()] },
    ]);
    executeConnectorMock.mockResolvedValue({
      connector_id: 'x',
      status: 'ok',
      data: { login: 'a' },
    });

    const results = await runCanaries({ log, dryRun: false, only: ['fake'] });

    expect(results).toHaveLength(1);
    expect(results[0].specId).toBe('.fake');
  });

  it('throws when --only matches no fixture', async () => {
    await expect(runCanaries({ log, dryRun: false, only: ['.nope'] })).rejects.toThrow(
      /No fixtures match/
    );
  });
});
