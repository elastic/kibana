/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  collectIgnoredKibanaFetcherOccurrences,
  collectIgnoredKibanaFetcherPaths,
  collectIgnoredKibanaFetcherStepNames,
  shouldWarnIgnoredKibanaFetcher,
  stepHasIgnoredKibanaFetcher,
} from './ignored_kibana_fetcher';
import type { WorkflowYaml } from './schema';

describe('ignored kibana fetcher helpers', () => {
  it('detects kibana steps that still set fetcher', () => {
    expect(
      stepHasIgnoredKibanaFetcher({
        type: 'kibana.request',
        with: { fetcher: { skip_ssl_verification: true } },
      })
    ).toBe(true);
  });

  it('ignores http connector fetcher settings', () => {
    expect(
      stepHasIgnoredKibanaFetcher({
        type: 'http',
        with: { fetcher: { skip_ssl_verification: true } },
      })
    ).toBe(false);
  });

  it('collects nested kibana step names', () => {
    const steps = [
      {
        name: 'outer',
        type: 'if',
        condition: 'true',
        steps: [
          {
            name: 'status',
            type: 'kibana.request',
            with: { fetcher: { keep_alive: true } },
          },
        ],
      },
      {
        name: 'ping',
        type: 'http',
        with: { fetcher: { keep_alive: true } },
      },
    ] as unknown as WorkflowYaml['steps'];

    expect(collectIgnoredKibanaFetcherStepNames(steps)).toEqual(['status']);
    expect(collectIgnoredKibanaFetcherPaths(steps)).toEqual([
      ['steps', 0, 'steps', 0, 'with', 'fetcher'],
    ]);
  });

  it('collects structural paths through parallel branches', () => {
    const steps = [
      {
        name: 'scatter',
        type: 'parallel',
        branches: [
          { name: 'left', steps: [{ name: 'ok', type: 'console', with: { message: 'ok' } }] },
          {
            name: 'right',
            steps: [
              {
                name: 'status',
                type: 'kibana.request',
                with: { fetcher: { keep_alive: true } },
              },
            ],
          },
        ],
      },
    ] as unknown as WorkflowYaml['steps'];

    expect(collectIgnoredKibanaFetcherPaths(steps)).toEqual([
      ['steps', 0, 'branches', 1, 'steps', 0, 'with', 'fetcher'],
    ]);
    expect(collectIgnoredKibanaFetcherOccurrences(steps)).toEqual([
      expect.objectContaining({
        path: ['steps', 0, 'branches', 1, 'steps', 0, 'with', 'fetcher'],
        stepType: 'kibana.request',
        stepName: 'status',
      }),
    ]);
  });

  it('warns kibana.* steps only when the self-client flag is on', () => {
    expect(shouldWarnIgnoredKibanaFetcher('kibana.createCase', false)).toBe(false);
    expect(shouldWarnIgnoredKibanaFetcher('kibana.request', false)).toBe(false);
    expect(shouldWarnIgnoredKibanaFetcher('kibana.createCase', true)).toBe(true);
    expect(shouldWarnIgnoredKibanaFetcher('kibana.request', true)).toBe(true);
    expect(shouldWarnIgnoredKibanaFetcher('http', true)).toBe(false);
  });
});
