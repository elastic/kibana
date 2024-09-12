/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch from 'node-fetch';
import pRetry from 'p-retry';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

import { FetchAgentVersionsList } from './fetch_agent_versions_list';
import { Build, Config, write } from '../lib';

jest.mock('node-fetch');
jest.mock('p-retry');
jest.mock('../lib');

const config = new Config(
  true,
  false,
  {
    version: '8.0.0',
    engines: {
      node: '*',
    },
    workspaces: {
      packages: [],
    },
  } as any,
  '1.2.3',
  REPO_ROOT,
  {
    buildNumber: 1234,
    buildSha: 'abcd1234',
    buildShaShort: 'abcd',
    buildVersion: '8.0.0',
    buildDate: '2023-05-15T23:12:09.000Z',
  },
  false,
  false,
  null,
  '',
  '',
  false,
  true,
  true,
  {}
);

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockedPRetry = pRetry as jest.MockedFunction<typeof pRetry>;
const mockedWrite = write as jest.MockedFunction<typeof write>;
const mockedBuild = new Build(config);

mockedPRetry.mockImplementation((fn: any) => {
  return fn();
});

const processEnv = process.env;

describe('FetchAgentVersionsList', () => {
  beforeEach(() => {
    process.env = {
      ...processEnv,
      // Ensure these tests can run in PR builds
      BUILDKITE_PULL_REQUEST: undefined,
    };

    mockedFetch.mockReset();
    (mockedBuild.resolvePath as jest.Mock<any>).mockReset();
    mockedWrite.mockReset();
  });

  afterEach(() => {
    process.env = processEnv;
  });

  describe('when BUILDKITE_PULL_REQUEST is set', () => {
    it('does not run task', async () => {
      process.env.BUILDKITE_PULL_REQUEST = '1234';

      await FetchAgentVersionsList.run(config, new ToolingLog(), mockedBuild);

      expect(mockedFetch).not.toHaveBeenCalled();
    });
  });

  describe('when valid JSON is returned from versions endpoint', () => {
    it('does not throw', async () => {
      mockedFetch.mockResolvedValueOnce({
        status: 200,
        text: jest.fn().mockResolvedValueOnce(
          JSON.stringify([
            [
              {
                title: 'Elastic Agent 8.0.0',
                version_number: '8.0.0',
              },
              {
                title: 'Elastic Agent 8.0.1',
                version_number: '8.0.1',
              },
            ],
          ])
        ),
      } as any);

      await FetchAgentVersionsList.run(config, new ToolingLog(), mockedBuild);

      expect(mockedWrite).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a network error is thrown', () => {
    it('throws', async () => {
      mockedFetch.mockResolvedValueOnce({
        status: 503,
        text: jest.fn().mockResolvedValueOnce('Gateway timeout'),
      } as any);

      try {
        await FetchAgentVersionsList.run(config, new ToolingLog(), mockedBuild);
      } catch (error) {
        expect(error).toBeTruthy();
        expect(mockedWrite).not.toHaveBeenCalled();
      }
    });
  });

  describe('when invalid json is returned from versions endpoint', () => {
    it('throws', async () => {
      mockedFetch.mockResolvedValueOnce({
        status: 200,
        text: jest.fn().mockResolvedValueOnce('not json'),
      } as any);

      try {
        await FetchAgentVersionsList.run(config, new ToolingLog(), mockedBuild);
      } catch (error) {
        expect(error).toBeTruthy();
        expect(mockedWrite).not.toHaveBeenCalled();
      }
    });
  });
});
