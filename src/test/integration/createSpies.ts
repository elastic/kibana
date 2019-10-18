import axios from 'axios';
import inquirer from 'inquirer';
import { commitsWithPullRequestsMock } from '../../services/github/mocks/commitsByAuthorMock';
import os from 'os';
import childProcess = require('child_process');
import {
  HOMEDIR_PATH,
  REMOTE_ORIGIN_REPO_PATH,
  REMOTE_FORK_REPO_PATH
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

  // mock verifyAccessToken
  jest.spyOn(axios, 'head').mockReturnValueOnce(true as any);

  // mock axios post request (graphql)
  const axiosPostSpy = jest
    .spyOn(axios, 'post')

    // mock getDefaultRepoBranch
    .mockReturnValueOnce({
      data: {
        data: { repository: { defaultBranchRef: { name: 'master' } } }
      }
    } as any)

    // mock author id
    .mockReturnValueOnce({
      data: {
        data: {
          user: {
            id: 'sqren_author_id'
          }
        }
      }
    } as any)

    // mock list of commits
    .mockReturnValueOnce({
      data: {
        data: commitsWithPullRequestsMock
      }
    } as any)

    // mock create pull request
    .mockReturnValueOnce({ data: {} } as any);

  // mock prompt
  jest
    .spyOn(inquirer, 'prompt')

    .mockImplementationOnce((async (args: any) => {
      return {
        promptResult:
          commitCount === 2
            ? [args[0].choices[0].value, args[0].choices[1].value]
            : args[0].choices[1].value
      };
    }) as any)
    .mockImplementationOnce((async (args: any) => {
      return { promptResult: args[0].choices[0].name };
    }) as any);

  return {
    getAxiosCalls: () => {
      const [
        getDefaultRepoBranch,
        getAuthorPayload,
        getCommitsPayload,
        createPullRequestPayload
      ] = axiosPostSpy.mock.calls.map(call => call[1]);

      return {
        getDefaultRepoBranch,
        getAuthorPayload,
        getCommitsPayload,
        createPullRequestPayload
      };
    }
  };
}
