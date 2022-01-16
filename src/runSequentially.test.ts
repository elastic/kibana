import os from 'os';
import { last } from 'lodash';
import nock from 'nock';
import { ValidConfigOptions } from './options/options';
import { runSequentially } from './runSequentially';
import * as childProcess from './services/child-process-promisified';
import { Commit } from './services/sourceCommit/parseSourceCommit';
import { listenForCallsToNockScope } from './test/nockHelpers';
import { SpyHelper } from './types/SpyHelper';

jest.mock('./services/child-process-promisified', () => {
  return {
    exec: jest.fn(async (cmd: string) => {
      throw new Error(`Mock required for exec with cmd: "${cmd}"`);
    }),

    execAsCallback: jest.fn((...args) => {
      last(args)();
      return {
        stderr: {
          on: () => null,
        },
      };
    }),
  };
});

describe('runSequentially', () => {
  let rpcExecMock: SpyHelper<typeof childProcess.exec>;
  let rpcExecOriginalMock: SpyHelper<typeof childProcess.execAsCallback>;
  let res: Awaited<ReturnType<typeof runSequentially>>;
  let createPullRequestCalls: unknown[];

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  beforeEach(async () => {
    jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');

    const options: ValidConfigOptions = {
      accessToken: 'myAccessToken',
      assignees: [],
      authenticatedUsername: 'sqren_authenticated',
      author: 'sqren',
      autoAssign: false,
      autoFixConflicts: undefined,
      autoMerge: false,
      autoMergeMethod: 'merge',
      backportBinary: 'node scripts/backport',
      branchLabelMapping: undefined,
      cherrypickRef: true,
      ci: false,
      commitPaths: [],
      dateSince: null,
      dateUntil: null,
      details: false,
      editor: 'code',
      fork: true,
      gitHostname: 'github.com',
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'http://localhost/graphql', // Using localhost to avoid CORS issues when making requests (related to nock and jsdom)
      historicalBranchLabelMappings: [],
      mainline: undefined,
      maxNumber: 10,
      multipleBranches: false,
      multipleCommits: false,
      noVerify: true,
      prFilter: undefined,
      publishStatusComment: true,
      pullNumber: undefined,
      repoName: 'kibana',
      repoOwner: 'elastic',
      resetAuthor: false,
      reviewers: [],
      sha: undefined,
      skipRemoteConfig: undefined,
      sourceBranch: 'my-source-branch-from-options',
      sourcePRLabels: [],
      targetBranches: [],
      targetBranchChoices: [
        { name: '6.x' },
        { name: '6.0' },
        { name: '5.6' },
        { name: '5.5' },
        { name: '5.4' },
      ],
      targetPRLabels: [],
      verbose: false,
    };

    rpcExecMock = jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValue({ stdout: 'success', stderr: '' });
    rpcExecOriginalMock = jest.spyOn(childProcess, 'execAsCallback');

    const scope = nock('https://api.github.com')
      .post('/repos/elastic/kibana/pulls')
      .reply(200, {
        number: 1337,
        html_url: 'myHtmlUrl',
      });

    createPullRequestCalls = listenForCallsToNockScope(scope);

    const commits: Commit[] = [
      {
        sha: 'abcd',
        committedDate: '1',
        expectedTargetPullRequests: [],
        originalMessage: 'My commit message',
        sourceBranch: 'master',
        pullNumber: 55,
      },
    ];
    const targetBranches: string[] = ['7.x'];

    res = await runSequentially({ options, commits, targetBranches });
    scope.done();
  });

  it('returns pull request', () => {
    expect(res).toEqual([
      {
        didUpdate: false,
        pullRequestNumber: 1337,
        pullRequestUrl: 'myHtmlUrl',
        status: 'success',
        targetBranch: '7.x',
      },
    ]);
  });

  it('creates pull request', () => {
    expect(createPullRequestCalls).toMatchInlineSnapshot(`
      Array [
        Object {
          "base": "7.x",
          "body": "# Backport

      This is an automatic backport to \`7.x\` of:
       - #55

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)",
          "head": "sqren_authenticated:backport/7.x/pr-55",
          "title": "[7.x] My commit message",
        },
      ]
    `);
  });

  it('should run all commands in the correct directory', () => {
    expect(
      rpcExecMock.mock.calls.every(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([cmd, opts]) =>
          opts.cwd === '/myHomeDir/.backport/repositories/elastic/kibana'
      )
    ).toBe(true);
  });

  it('exec should be called with correct args', () => {
    expect(rpcExecMock).toHaveBeenCalledTimes(10);
    expect(rpcExecMock.mock.calls.map(([cmd]) => cmd)).toEqual([
      'git remote rm origin',
      'git remote rm sqren_authenticated',
      'git remote add sqren_authenticated https://x-access-token:myAccessToken@github.com/sqren_authenticated/kibana.git',
      'git remote rm elastic',
      'git remote add elastic https://x-access-token:myAccessToken@github.com/elastic/kibana.git',
      'git reset --hard && git clean -d --force && git fetch elastic 7.x && git checkout -B backport/7.x/pr-55 elastic/7.x --no-track',
      'git fetch elastic master:master --force',
      'git cherry-pick -x abcd',
      'git push sqren_authenticated backport/7.x/pr-55:backport/7.x/pr-55 --force',
      'git reset --hard && git checkout my-source-branch-from-options && git branch -D backport/7.x/pr-55',
    ]);
  });

  it('git clone should be called with correct args', () => {
    expect(rpcExecOriginalMock).toHaveBeenCalledTimes(1);
    expect(rpcExecOriginalMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "git clone https://x-access-token:myAccessToken@github.com/elastic/kibana.git /myHomeDir/.backport/repositories/elastic/kibana --progress",
          Object {
            "maxBuffer": 104857600,
          },
          [Function],
        ],
      ]
    `);
  });
});
