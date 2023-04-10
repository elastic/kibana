/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import fetch from 'node-fetch';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

import { FetchAgentVersionsList } from './fetch_agent_versions_list';
import { Build, Config, write } from '../lib';

jest.mock('node-fetch');
jest.mock('../lib');

const config = new Config(
  true,
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
    buildVersion: '8.0.0',
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
const mockedWrite = write as jest.MockedFunction<typeof write>;
const mockedBuild = new Build(config);

describe('FetchAgentVersionsList', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    (mockedBuild.resolvePath as jest.Mock<any>).mockReset();
    mockedWrite.mockReset();
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
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

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
