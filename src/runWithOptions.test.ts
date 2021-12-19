import inquirer from 'inquirer';
import { last } from 'lodash';
import nock from 'nock';
import { ValidConfigOptions } from './options/options';
import { runWithOptions } from './runWithOptions';
import * as childProcess from './services/child-process-promisified';
import * as fs from './services/fs-promisified';
import { AuthorIdResponse } from './services/github/v4/fetchAuthorId';
import { CommitByAuthorResponse } from './services/github/v4/fetchCommits/fetchCommitsByAuthor';
import { commitsByAuthorMock } from './services/github/v4/mocks/commitsByAuthorMock';
import { mockGqlRequest, getNockCallsForScope } from './test/nockHelpers';
import { PromiseReturnType } from './types/PromiseReturnType';
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

describe('runWithOptions', () => {
  let rpcExecMock: SpyHelper<typeof childProcess.exec>;
  let rpcExecOriginalMock: SpyHelper<typeof childProcess.execAsCallback>;
  let inquirerPromptMock: SpyHelper<typeof inquirer.prompt>;
  let res: PromiseReturnType<typeof runWithOptions>;
  let createPullRequestCalls: unknown[];
  let commitsByAuthorCalls: ReturnType<typeof mockGqlRequest>;
  let authorIdCalls: ReturnType<typeof mockGqlRequest>;

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  beforeEach(async () => {
    const options: ValidConfigOptions = {
      accessToken: 'myAccessToken',
      all: false,
      assignees: [],
      author: 'sqren',
      autoAssign: false,
      autoFixConflicts: undefined,
      autoMerge: false,
      autoMergeMethod: 'merge',
      branchLabelMapping: undefined,
      ci: false,
      commitPaths: [],
      details: false,
      editor: 'code',
      forceLocalConfig: undefined,
      fork: true,
      gitHostname: 'github.com',
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'http://localhost/graphql', // Using localhost to avoid CORS issues when making requests (related to nock and jsdom)
      mainline: undefined,
      maxNumber: 10,
      multipleBranches: false,
      multipleCommits: false,
      noVerify: true,
      prDescription: 'myPrDescription',
      prFilter: undefined,
      prTitle: 'myPrTitle {targetBranch} {commitMessages}',
      pullNumber: undefined,
      repoName: 'kibana',
      repoOwner: 'elastic',
      resetAuthor: false,
      sha: undefined,
      sourceBranch: 'my-source-branch-from-options',
      sourcePRLabels: [],
      targetBranches: [],
      upstream: 'elastic/kibana',
      targetBranchChoices: [
        { name: '6.x' },
        { name: '6.0' },
        { name: '5.6' },
        { name: '5.5' },
        { name: '5.4' },
      ],
      targetPRLabels: [],
      username: 'sqren',
      verbose: false,
    };

    rpcExecMock = jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValue({ stdout: 'success', stderr: '' });
    rpcExecOriginalMock = jest.spyOn(childProcess, 'execAsCallback');

    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    inquirerPromptMock = jest
      .spyOn(inquirer, 'prompt')
      .mockImplementationOnce((async (args: any) => {
        return { promptResult: args[0].choices[0].value };
      }) as any)
      .mockImplementationOnce((async (args: any) => {
        return { promptResult: args[0].choices[0].name };
      }) as any);

    authorIdCalls = mockGqlRequest<AuthorIdResponse>({
      name: 'AuthorId',
      statusCode: 200,
      body: { data: { user: { id: 'sqren_author_id' } } },
    });

    commitsByAuthorCalls = mockGqlRequest<CommitByAuthorResponse>({
      name: 'CommitsByAuthor',
      statusCode: 200,
      body: { data: commitsByAuthorMock },
    });

    const scope = nock('https://api.github.com')
      .post('/repos/elastic/kibana/pulls')
      .reply(200, { html_url: 'pull request url', number: 1337 });
    createPullRequestCalls = getNockCallsForScope(scope);

    res = await runWithOptions(options);
    scope.done();
  });

  it('returns pull request', () => {
    expect(res).toEqual([
      {
        pullRequestUrl: 'pull request url',
        success: true,
        targetBranch: '6.x',
      },
    ]);
  });

  it('creates pull request', () => {
    expect(createPullRequestCalls).toEqual([
      {
        base: '6.x',
        body: 'Backports the following commits to 6.x:\n - Add 👻 (2e63475c)\n\nmyPrDescription',
        head: 'sqren:backport/6.x/commit-2e63475c',
        title: 'myPrTitle 6.x Add 👻',
      },
    ]);
  });

  it('retrieves author id', () => {
    expect(authorIdCalls).toMatchInlineSnapshot(`
      Array [
        Object {
          "query": "
          query AuthorId($login: String!) {
            user(login: $login) {
              id
            }
          }
        ",
          "variables": Object {
            "login": "sqren",
          },
        },
      ]
    `);
  });

  it('retrieves commits by author', () => {
    expect(commitsByAuthorCalls.map((body) => body.variables)).toEqual([
      {
        authorId: 'sqren_author_id',
        maxNumber: 10,
        commitPath: null,
        repoName: 'kibana',
        repoOwner: 'elastic',
        sourceBranch: 'my-source-branch-from-options',
      },
    ]);
  });

  it('prompt calls should match snapshot', () => {
    expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    expect(
      // @ts-expect-error
      inquirerPromptMock.mock.calls[0][0][0].choices.map(({ name, short }) => ({
        name,
        short,
      }))
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "1. Add 👻 ",
          "short": "2e63475c",
        },
        Object {
          "name": "2. Add witch (#85) ",
          "short": "#85 (f3b618b9)",
        },
        Object {
          "name": "3. Add SF mention (#80) 6.3",
          "short": "#80 (79cf1845)",
        },
        Object {
          "name": "4. Add backport config ",
          "short": "3827bbba",
        },
        Object {
          "name": "5. Initial commit ",
          "short": "5ea0da55",
        },
      ]
    `);
  });

  it('exec should be called with correct args', () => {
    expect(rpcExecMock).toHaveBeenCalledTimes(10);
    expect(rpcExecMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "git remote rm origin",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git remote rm sqren",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git remote add sqren https://x-access-token:myAccessToken@github.com/sqren/kibana.git",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git remote rm elastic",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git remote add elastic https://x-access-token:myAccessToken@github.com/elastic/kibana.git",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git reset --hard && git clean -d --force && git fetch elastic 6.x && git checkout -B backport/6.x/commit-2e63475c elastic/6.x --no-track",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git fetch elastic my-source-branch-from-options:my-source-branch-from-options --force",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git cherry-pick 2e63475c483f7844b0f2833bc57fdee32095bacb",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git push sqren backport/6.x/commit-2e63475c:backport/6.x/commit-2e63475c --force",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
        Array [
          "git reset --hard && git checkout my-source-branch-from-options && git branch -D backport/6.x/commit-2e63475c",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic/kibana",
          },
        ],
      ]
    `);
  });

  it('git clone should be called with correct args', () => {
    expect(rpcExecOriginalMock).toHaveBeenCalledTimes(1);
    expect(rpcExecOriginalMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "git clone https://x-access-token:myAccessToken@github.com/elastic/kibana.git --progress",
          Object {
            "cwd": "/myHomeDir/.backport/repositories/elastic",
            "maxBuffer": 104857600,
          },
          [Function],
        ],
      ]
    `);
  });
});
