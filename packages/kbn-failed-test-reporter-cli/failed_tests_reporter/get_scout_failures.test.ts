/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import Path from 'path';
import { getScoutFailures } from './get_scout_failures';

const LOCATOR_TIMEOUT = `TimeoutError: locator.click: Timeout 60000ms exceeded.
Call log:
  - waiting for getByTestId('streamsAppPreviewTableViewModeToggle')`;

const CONNECTION_CLOSED_CONSOLE_ERRORS = [
  '[2026-10-09T09:44:51.915Z] Failed to load resource: net::ERR_CONNECTION_CLOSED',
  '[2026-10-09T09:44:51.916Z] Failed to load resource: net::ERR_CONNECTION_CLOSED',
].join('\n');

const createEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-id',
  suite: 'Stream data processing - simulation preview',
  title: 'should display default samples',
  target: 'cloud-serverless-observability_complete',
  command: 'node scripts/scout run-tests',
  location: 'x-pack/platform/plugins/shared/streams_app/test/scout/processing/ui/tests/x.spec.ts',
  owner: ['@elastic/obs-onboarding-team'],
  duration: 60000,
  error: { message: LOCATOR_TIMEOUT, stack_trace: LOCATOR_TIMEOUT },
  attachments: [],
  timestamp: '2026-10-09T09:44:52.000Z',
  ...overrides,
});

describe('getScoutFailures', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'scout-failures-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeReport = (entries: Array<Record<string, unknown>>) => {
    const reportPath = Path.join(tmpDir, 'scout-failures-run.ndjson');
    fs.writeFileSync(reportPath, entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n');
    return reportPath;
  };

  it('marks a regular failure as relevant', async () => {
    const [failure] = await getScoutFailures(writeReport([createEntry()]));
    expect(failure.likelyIrrelevant).toBe(false);
    expect(failure.infraReason).toBeUndefined();
  });

  it.each([
    ['Error: Failed to parse SAML response value.', 'auth'],
    ['Error: SAML callback failed: expected 302, got 401', 'auth'],
    ['Error: Failed to create the new cloud session', 'auth'],
    ["Error: User with 'rule_author' role is not defined", 'role'],
    ['Error: connect ECONNREFUSED 127.0.0.1:5620', 'connection'],
  ])('attributes "%s" to infrastructure (%s)', async (message, category) => {
    const [failure] = await getScoutFailures(
      writeReport([createEntry({ error: { message, stack_trace: message } })])
    );
    expect(failure.likelyIrrelevant).toBe(true);
    expect(failure.infraReason?.category).toBe(category);
  });

  it('keeps local SAML failures relevant but still attributes local ECONNREFUSED to infra', async () => {
    const target = 'local-serverless-observability_complete';
    const samlMessage = 'Error: SAML callback failed: expected 302, got 401';
    const connectionMessage = 'Error: connect ECONNREFUSED 127.0.0.1:5620';
    const [samlFailure, connectionFailure] = await getScoutFailures(
      writeReport([
        createEntry({ target, error: { message: samlMessage, stack_trace: samlMessage } }),
        createEntry({
          target,
          error: { message: connectionMessage, stack_trace: connectionMessage },
        }),
      ])
    );
    expect(samlFailure.infraReason).toBeUndefined();
    expect(connectionFailure.infraReason?.category).toBe('connection');
  });

  it('attributes Cloud failures with connection-level browser console errors to the network', async () => {
    const [failure] = await getScoutFailures(
      writeReport([createEntry({ consoleErrors: CONNECTION_CLOSED_CONSOLE_ERRORS })])
    );
    expect(failure.likelyIrrelevant).toBe(true);
    expect(failure.infraReason?.category).toBe('network');
  });

  it('attributes Cloud failures with ChunkLoadError to the CDN and points to Kibana Core', async () => {
    const [failure] = await getScoutFailures(
      writeReport([
        createEntry({
          consoleErrors: [
            '[2026-10-07T05:20:13.630Z] ChunkLoadError: Loading chunk 51479 failed.',
            '(error: https://kibana.estccdn.com/68622be1b808/bundles/chunks/51479.10b3db5c.js)',
            '[2026-10-07T05:20:13.631Z] Failed to load resource: net::ERR_CONNECTION_CLOSED',
          ].join('\n'),
        }),
      ])
    );
    expect(failure.likelyIrrelevant).toBe(true);
    expect(failure.infraReason).toEqual({
      category: 'cdn',
      message: expect.stringContaining('contact Kibana Core (@elastic/kibana-core)'),
    });
  });

  it('keeps local failures with connection-level browser console errors relevant', async () => {
    const [failure] = await getScoutFailures(
      writeReport([
        createEntry({
          target: 'local-serverless-observability_complete',
          consoleErrors: CONNECTION_CLOSED_CONSOLE_ERRORS,
        }),
      ])
    );
    expect(failure.likelyIrrelevant).toBe(false);
  });

  it('keeps Cloud failures with unrelated browser console errors relevant', async () => {
    const [failure] = await getScoutFailures(
      writeReport([
        createEntry({
          consoleErrors:
            '[2026-10-09T09:44:51.915Z] Failed to load resource: the server responded with a status of 500 ()',
        }),
      ])
    );
    expect(failure.likelyIrrelevant).toBe(false);
  });
});
