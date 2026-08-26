/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pickScoutFlakyRunOrder, type ScoutFlakyRequest } from './pick_scout_flaky_run_order';

const uploadStepsMock = jest.fn();

jest.mock('../buildkite', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    uploadSteps: uploadStepsMock,
  })),
}));

jest.mock('../agent_images', () => ({
  expandAgentQueue: (queue: string) => ({ queue }),
}));

jest.mock('../pr_labels', () => ({
  collectEnvFromLabels: () => ({}),
}));

const CONFIG_PATH = 'x-pack/solutions/observability/plugins/apm/test/scout/ui/playwright.config.ts';

const writeManifest = (serverRunFlags: string[]): string => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-flaky-test-'));
  const manifestPath = path.join(tmpDir, 'scout_playwright_configs.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify([
      {
        group: 'apm',
        configs: [{ path: CONFIG_PATH, serverRunFlags, usesParallelWorkers: false }],
      },
    ])
  );
  return manifestPath;
};

describe('pickScoutFlakyRunOrder grep handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards grep as SCOUT_GREP env and annotates the step label', async () => {
    const manifestPath = writeManifest(['--arch serverless --domain search']);
    const requests: ScoutFlakyRequest[] = [
      { type: 'scoutConfig', scoutConfig: CONFIG_PATH, count: 3, grep: 'service map' },
    ];

    await pickScoutFlakyRunOrder(manifestPath, requests, { concurrency: 25 });

    expect(uploadStepsMock).toHaveBeenCalledTimes(1);
    const steps = uploadStepsMock.mock.calls[0][0];
    expect(steps).toHaveLength(1);
    expect(steps[0].env.SCOUT_GREP).toBe('service map');
    expect(steps[0].label).toBe(
      `${CONFIG_PATH} (--arch serverless --domain search) [grep: service map]`
    );
  });

  it('omits SCOUT_GREP and the label suffix when no grep is provided', async () => {
    const manifestPath = writeManifest(['--arch stateful --domain classic']);
    const requests: ScoutFlakyRequest[] = [
      { type: 'scoutConfig', scoutConfig: CONFIG_PATH, count: 2 },
    ];

    await pickScoutFlakyRunOrder(manifestPath, requests, { concurrency: 25 });

    const steps = uploadStepsMock.mock.calls[0][0];
    expect(steps[0].env).not.toHaveProperty('SCOUT_GREP');
    expect(steps[0].label).toBe(`${CONFIG_PATH} (--arch stateful --domain classic)`);
  });

  it('applies the same grep to every (arch, domain) mode the config fans out to', async () => {
    const manifestPath = writeManifest([
      '--arch serverless --domain search',
      '--arch serverless --domain observability',
    ]);
    const requests: ScoutFlakyRequest[] = [
      { type: 'scoutConfig', scoutConfig: CONFIG_PATH, count: 1, grep: 'login' },
    ];

    await pickScoutFlakyRunOrder(manifestPath, requests, { concurrency: 25 });

    const steps = uploadStepsMock.mock.calls[0][0];
    expect(steps).toHaveLength(2);
    expect(
      steps.every((step: { env: { SCOUT_GREP?: string } }) => step.env.SCOUT_GREP === 'login')
    ).toBe(true);
  });

  it('rejects an empty grep string', async () => {
    const manifestPath = writeManifest(['--arch stateful --domain classic']);
    const requests: ScoutFlakyRequest[] = [
      { type: 'scoutConfig', scoutConfig: CONFIG_PATH, count: 1, grep: '   ' },
    ];

    await expect(
      pickScoutFlakyRunOrder(manifestPath, requests, { concurrency: 25 })
    ).rejects.toThrow(`Request 'grep' must be a non-empty string when provided`);
    expect(uploadStepsMock).not.toHaveBeenCalled();
  });
});
