import childProcess = require('child_process');
import os from 'os';
import inquirer from 'inquirer';
import nock from 'nock';
import { commitsWithPullRequestsMock } from '../../services/github/v4/mocks/commitsByAuthorMock';
import { mockGqlRequest, getNockCallsForScope } from '../nockHelpers';
import {
  HOMEDIR_PATH,
  REMOTE_ORIGIN_REPO_PATH,
  REMOTE_FORK_REPO_PATH,
} from './envConstants';

const unmockedExec = childProcess.exec;

export function createSpies({ commitCount }: { commitCount: number }) {
  // set alternative homedir
  jest.spyOn(os, 'homedir').mockReturnValue(HOMEDIR_PATH);

  // mock childProcess.exec
  mockExec();

  // mock inquirer.prompt
  mockInquirerPrompts(commitCount);

  const getDefaultRepoBranchCalls = mockGqlRequest({
    name: 'DefaultRepoBranch',
    statusCode: 200,
    body: { data: { repository: { defaultBranchRef: { name: 'master' } } } },
  });

  const authorIdCalls = mockGqlRequest({
    name: 'AuthorId',
    statusCode: 200,
    body: { data: { user: { id: 'sqren_author_id' } } },
  });

  const commitsByAuthorCalls = mockGqlRequest({
    name: 'CommitsByAuthor',
    statusCode: 200,
    body: { data: commitsWithPullRequestsMock },
  });

  const createPullRequestCalls = mockCreatePullRequest();

  return {
    getDefaultRepoBranchCalls,
    authorIdCalls,
    commitsByAuthorCalls,
    createPullRequestCalls,
  };
}

function mockExec() {
  jest.spyOn(childProcess, 'exec').mockImplementation((cmd, options, cb) => {
    const nextCmd = cmd
      .replace(
        'https://x-access-token:myAccessToken@github.com/backport-org/backport-demo.git',
        REMOTE_ORIGIN_REPO_PATH
      )
      .replace(
        'https://x-access-token:myAccessToken@github.com/sqren/backport-demo.git',
        REMOTE_FORK_REPO_PATH
      );

    return unmockedExec(nextCmd, options, cb);
  });
}

function mockInquirerPrompts(commitCount: number) {
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
}

function mockCreatePullRequest() {
  const scope = nock('https://api.github.com')
    .post('/repos/backport-org/backport-demo/pulls')
    .reply(200, { number: 1337, html_url: 'myHtmlUrl' });

  return getNockCallsForScope(scope);
}
