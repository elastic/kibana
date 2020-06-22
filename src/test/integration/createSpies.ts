import childProcess = require('child_process');
import os from 'os';
import axios from 'axios';
import inquirer from 'inquirer';
import { commitsWithPullRequestsMock } from '../../services/github/v4/mocks/commitsByAuthorMock';
import { logger } from '../../services/logger';
import { SpyHelper } from '../../types/SpyHelper';
import {
  HOMEDIR_PATH,
  REMOTE_ORIGIN_REPO_PATH,
  REMOTE_FORK_REPO_PATH,
} from './envConstants';

const unmockedExec = childProcess.exec;

export function createSpies({ commitCount }: { commitCount: number }) {
  // set alternative homedir
  jest.spyOn(os, 'homedir').mockReturnValue(HOMEDIR_PATH);

  // proxy exec calls and make a few modifications
  jest.spyOn(childProcess, 'exec').mockImplementation((cmd, options, cb) => {
    const nextCmd = cmd
      .replace(
        'https://myAccessToken@github.com/elastic/backport-demo.git',
        REMOTE_ORIGIN_REPO_PATH
      )
      .replace(
        'https://myAccessToken@github.com/sqren/backport-demo.git',
        REMOTE_FORK_REPO_PATH
      );

    return unmockedExec(nextCmd, options, cb);
  });

  // mock github API v4
  const axiosPostSpy = jest
    .spyOn(axios, 'post')

    // mock `getDefaultRepoBranchAndPerformStartupChecks`
    .mockResolvedValueOnce({
      data: {
        data: { repository: { defaultBranchRef: { name: 'master' } } },
      },
      headers: { 'custom-header': 'foo' },
      status: 200,
    })

    // mock `getIdByLogin`
    .mockResolvedValueOnce({
      data: {
        data: {
          user: {
            id: 'sqren_author_id',
          },
        },
      },
      headers: { 'custom-header': 'foo' },
      status: 200,
    })

    // mock `fetchCommitsByAuthor`
    .mockResolvedValueOnce({
      data: { data: commitsWithPullRequestsMock },
      headers: { 'custom-header': 'foo' },
      status: 200,
    });

  // mock githb API v3
  const axiosRequestSpy = jest
    .spyOn(axios, 'request')

    // mock create pull request
    .mockResolvedValueOnce({
      data: {},
      headers: { 'custom-header': 'foo' },
      status: 200,
    });

  // mock prompt
  jest
    .spyOn(inquirer, 'prompt')

    .mockImplementationOnce((async (args: any) => {
      return {
        promptResult:
          commitCount === 2
            ? [args[0].choices[0].value, args[0].choices[1].value]
            : args[0].choices[1].value,
      };
    }) as any)
    .mockImplementationOnce((async (args: any) => {
      return { promptResult: args[0].choices[0].name };
    }) as any);

  return {
    getSpyCalls: () => {
      const [
        getDefaultRepoBranchAndPerformStartupChecks,
        getAuthorRequestConfig,
        getCommitsRequestConfig,
      ] = axiosPostSpy.mock.calls.map((call) => call[1]);

      const [createTargetPullRequestPayload] = axiosRequestSpy.mock.calls.map(
        (call) => call[0].data
      );

      const loggerSpy = (logger as any).spy as SpyHelper<typeof logger.info>;
      const loggerCalls = loggerSpy.mock.calls.map(([msg, meta]) => {
        return [
          msg,

          typeof meta === 'string'
            ? meta
                // remove commit hash in commit summary
                .replace?.(/\b[0-9a-f]{5,40}\b/g, '<COMMIT HASH>')

                // remove author in commit summary (response from `git cherrypick`)
                .replace(/^\s+Author:.+$\n/gm, '')
            : meta,
        ];
      });

      return {
        // all log calls (info, verbose and debug) are al routed to the same spy
        loggerCalls,
        getDefaultRepoBranchAndPerformStartupChecks,
        getAuthorRequestConfig,
        getCommitsRequestConfig,
        createTargetPullRequestPayload,
      };
    },
  };
}
