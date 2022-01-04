import os from 'os';
import nock from 'nock';
import ora from 'ora';
import stripAnsi from 'strip-ansi';
import { ValidConfigOptions } from '../options/options';
import * as childProcess from '../services/child-process-promisified';
import * as git from '../services/git';
import * as fetchCommitsByAuthorModule from '../services/github/v4/fetchCommits/fetchCommitsByAuthor';
import { commitsByAuthorMock } from '../services/github/v4/mocks/commitsByAuthorMock';
import * as logger from '../services/logger';
import * as prompts from '../services/prompts';
import { ExpectedTargetPullRequest } from '../services/sourceCommit/getExpectedTargetPullRequests';
import { Commit } from '../services/sourceCommit/parseSourceCommit';
import { ExecError } from '../test/ExecError';
import { listenForCallsToNockScope, mockGqlRequest } from '../test/nockHelpers';
import { SpyHelper } from '../types/SpyHelper';
import {
  cherrypickAndCreateTargetPullRequest,
  getCommitsWithoutBackports,
} from './cherrypickAndCreateTargetPullRequest';

describe('cherrypickAndCreateTargetPullRequest', () => {
  let execSpy: SpyHelper<typeof childProcess.exec>;
  let addLabelsScope: ReturnType<typeof nock>;
  let consoleLogSpy: SpyHelper<typeof logger['consoleLog']>;

  beforeEach(() => {
    jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');

    execSpy = jest
      .spyOn(childProcess, 'exec')

      // mock all exec commands to respond without errors
      .mockResolvedValue({ stdout: '', stderr: '' });

    consoleLogSpy = jest.spyOn(logger, 'consoleLog');

    // ensure labels are added
    addLabelsScope = nock('https://api.github.com')
      .post('/repos/elastic/kibana/issues/1337/labels', {
        labels: ['backport'],
      })
      .reply(200);
  });

  afterEach(() => {
    jest.clearAllMocks();
    addLabelsScope.done();
    nock.cleanAll();
  });

  describe('when commit has a pull request reference', () => {
    let res: Awaited<ReturnType<typeof cherrypickAndCreateTargetPullRequest>>;
    let createPullRequestCalls: unknown[];

    beforeEach(async () => {
      const options = {
        assignees: [] as string[],
        authenticatedUsername: 'sqren_authenticated',
        fork: true,
        prDescription: 'myPrSuffix',
        prTitle: '[{targetBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        reviewers: [] as string[],
        sourceBranch: 'myDefaultSourceBranch',
        sourcePRLabels: [] as string[],
        targetPRLabels: ['backport'],
        author: 'sqren',
      } as ValidConfigOptions;

      const commits: Commit[] = [
        {
          committedDate: 'fff',
          sourceBranch: '7.x',
          sha: 'mySha',
          originalMessage: 'My original commit message (#1000)',
          pullNumber: 1000,
          expectedTargetPullRequests: [],
        },
        {
          committedDate: 'ggg',
          sourceBranch: '7.x',
          sha: 'mySha2',
          originalMessage: 'My other commit message (#2000)',
          pullNumber: 2000,
          expectedTargetPullRequests: [],
        },
      ];

      const scope = nock('https://api.github.com')
        .post('/repos/elastic/kibana/pulls')
        .reply(200, { number: 1337, html_url: 'myHtmlUrl' });

      createPullRequestCalls = listenForCallsToNockScope(scope);

      res = await cherrypickAndCreateTargetPullRequest({
        options,
        commits,
        targetBranch: '6.x',
      });

      scope.done();
      nock.cleanAll();
    });

    it('creates the pull request with multiple PR references', () => {
      expect(createPullRequestCalls).toMatchInlineSnapshot(`
        Array [
          Object {
            "base": "6.x",
            "body": "# Backport

        This is an automatic backport to 6.x of:
         - #1000
         - #2000

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)

        myPrSuffix",
            "head": "sqren_authenticated:backport/6.x/pr-1000_pr-2000",
            "title": "[6.x] My original commit message (#1000) | My other commit message (#2000)",
          },
        ]
      `);
    });

    it('returns the expected response', () => {
      expect(res).toEqual({ didUpdate: false, url: 'myHtmlUrl', number: 1337 });
    });

    it('should make correct git commands', () => {
      expect(execSpy.mock.calls).toMatchSnapshot();
    });

    it('logs correctly', () => {
      expect(consoleLogSpy.mock.calls.length).toBe(2);
      expect(consoleLogSpy.mock.calls[0][0]).toMatchInlineSnapshot(`
        "
        Backporting to 6.x:"
      `);
      expect(consoleLogSpy.mock.calls[1][0]).toMatchInlineSnapshot(
        `"View pull request: myHtmlUrl"`
      );
    });

    it('should start the spinner with the correct text', () => {
      expect((ora as any).mock.calls.map((call: any) => call[0]))
        .toMatchInlineSnapshot(`
        Array [
          "Pulling latest changes",
          "Cherry-picking: My original commit message (#1000)",
          "Cherry-picking: My other commit message (#2000)",
          "Pushing branch \\"sqren_authenticated:backport/6.x/pr-1000_pr-2000\\"",
          undefined,
          "Creating pull request",
          "Adding labels: backport",
        ]
      `);
    });
  });

  describe('when commit does not have a pull request reference', () => {
    let res: Awaited<ReturnType<typeof cherrypickAndCreateTargetPullRequest>>;
    let createPullRequestCalls: unknown[];

    beforeEach(async () => {
      const options = {
        assignees: [] as string[],
        authenticatedUsername: 'sqren_authenticated',
        fork: true,
        prTitle: '[{targetBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        reviewers: [] as string[],
        sourcePRLabels: [] as string[],
        targetPRLabels: ['backport'],
        author: 'sqren',
      } as ValidConfigOptions;

      const commits = [
        {
          committedDate: 'hhh',
          sourceBranch: '7.x',
          sha: 'mySha',
          originalMessage: 'My original commit message',
          expectedTargetPullRequests: [],
        },
      ];

      const scope = nock('https://api.github.com')
        .post('/repos/elastic/kibana/pulls')
        .reply(200, { number: 1337, html_url: 'myHtmlUrl' });

      createPullRequestCalls = listenForCallsToNockScope(scope);

      res = await cherrypickAndCreateTargetPullRequest({
        options,
        commits,
        targetBranch: '6.x',
      });
      scope.done();
      nock.cleanAll();
    });

    it('creates the pull request with commit reference', () => {
      expect(createPullRequestCalls).toMatchInlineSnapshot(`
        Array [
          Object {
            "base": "6.x",
            "body": "# Backport

        This is an automatic backport to 6.x of:
         - My original commit message (mySha)

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)
        ",
            "head": "sqren_authenticated:backport/6.x/commit-mySha",
            "title": "[6.x] My original commit message",
          },
        ]
      `);
    });

    it('returns the expected response', () => {
      expect(res).toEqual({ didUpdate: false, url: 'myHtmlUrl', number: 1337 });
    });
  });

  describe('when cherry-picking fails', () => {
    let res: Awaited<ReturnType<typeof cherrypickAndCreateTargetPullRequest>>;
    let promptSpy: SpyHelper<typeof prompts['confirmPrompt']>;
    let execSpy: ReturnType<typeof setupExecSpyForCherryPick>;
    let commitsByAuthorCalls: ReturnType<typeof mockGqlRequest>;
    let createPullRequestCalls: unknown[];

    beforeEach(async () => {
      // spies
      promptSpy = jest.spyOn(prompts, 'confirmPrompt').mockResolvedValue(true);
      execSpy = setupExecSpyForCherryPick();

      const options = {
        assignees: [] as string[],
        authenticatedUsername: 'sqren_authenticated',
        fork: true,
        githubApiBaseUrlV4: 'http://localhost/graphql',
        prTitle: '[{targetBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        reviewers: [] as string[],
        sourceBranch: 'myDefaultSourceBranch',
        sourcePRLabels: [] as string[],
        targetPRLabels: ['backport'],
        author: 'sqren',
      } as ValidConfigOptions;

      const scope = nock('https://api.github.com')
        .post('/repos/elastic/kibana/pulls')
        .reply(200, { number: 1337, html_url: 'myHtmlUrl' });

      createPullRequestCalls = listenForCallsToNockScope(scope);

      commitsByAuthorCalls =
        mockGqlRequest<fetchCommitsByAuthorModule.CommitByAuthorResponse>({
          name: 'CommitsByAuthor',
          statusCode: 200,
          body: { data: commitsByAuthorMock },
        });

      res = await cherrypickAndCreateTargetPullRequest({
        options,
        commits: [
          {
            committedDate: 'eee',
            sourceBranch: '7.x',
            sha: 'mySha',
            originalMessage: 'My original commit message',
            expectedTargetPullRequests: [],
          },
        ],
        targetBranch: '6.x',
      });

      scope.done();
      nock.cleanAll();
    });

    it('creates the pull request with commit reference', () => {
      expect(createPullRequestCalls).toMatchInlineSnapshot(`
        Array [
          Object {
            "base": "6.x",
            "body": "# Backport

        This is an automatic backport to 6.x of:
         - My original commit message (mySha)

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)
        ",
            "head": "sqren_authenticated:backport/6.x/commit-mySha",
            "title": "[6.x] My original commit message",
          },
        ]
      `);
    });

    it('returns the expected response', () => {
      expect(res).toEqual({ didUpdate: false, url: 'myHtmlUrl', number: 1337 });
    });

    it('shows the right prompts', () => {
      expect(promptSpy.mock.calls.length).toBe(4);

      expect(promptSpy.mock.calls[0][0]).toMatchInlineSnapshot(`
        "Fix the following conflicts manually:

        Conflicting files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt


        Press ENTER when the conflicts are resolved and files are staged"
      `);

      expect(promptSpy.mock.calls[1][0]).toMatchInlineSnapshot(`
        "Fix the following conflicts manually:

        Conflicting files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt


        Press ENTER when the conflicts are resolved and files are staged"
      `);

      expect(promptSpy.mock.calls[2][0]).toMatchInlineSnapshot(`
        "Fix the following conflicts manually:

        Conflicting files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt


        Press ENTER when the conflicts are resolved and files are staged"
      `);
    });

    it('commitsByAuthor is called with correct arguments', () => {
      expect(commitsByAuthorCalls[0].variables).toMatchInlineSnapshot(`
        Object {
          "authorId": null,
          "commitPath": "conflicting-file.txt",
          "maxNumber": 10,
          "repoName": "kibana",
          "repoOwner": "elastic",
          "sourceBranch": "myDefaultSourceBranch",
        }
      `);
    });

    it('calls exec correctly', () => {
      expect(execSpy.mock.calls).toMatchSnapshot();
    });

    it('calls ora correctly', () => {
      expect((ora as any).mock.calls.map((call: any) => call[0]))
        .toMatchInlineSnapshot(`
        Array [
          "Pulling latest changes",
          "Cherry-picking: My original commit message",
          "Finalizing cherrypick",
          "Pushing branch \\"sqren_authenticated:backport/6.x/commit-mySha\\"",
          undefined,
          "Creating pull request",
          "Adding labels: backport",
        ]
      `);
    });

    it('logs correctly', async () => {
      expect(consoleLogSpy.mock.calls[0][0]).toMatchInlineSnapshot(`
        "
        Backporting to 6.x:"
      `);
      expect(consoleLogSpy.mock.calls[1][0]).toMatchInlineSnapshot(`
        "
        The commit could not be backported due to conflicts
        "
      `);
      expect(consoleLogSpy.mock.calls[2][0]).toMatchInlineSnapshot(`
        "
        ----------------------------------------
        "
      `);
      expect(consoleLogSpy.mock.calls[3][0]).toMatchInlineSnapshot(`
        "
        ----------------------------------------
        "
      `);
    });
  });
});

describe('getCommitsWithoutBackports', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('expectedTargetPullRequests', () => {
    function setup({
      expectedTargetPullRequests,
    }: {
      expectedTargetPullRequests: ExpectedTargetPullRequest[];
    }) {
      // simulate 1 unbackported commit
      jest
        .spyOn(fetchCommitsByAuthorModule, 'fetchCommitsByAuthor')
        .mockResolvedValueOnce([
          {
            committedDate: '10',
            expectedTargetPullRequests,
            originalMessage: 'First commit (#1)',
            sha: 'xyz',
            sourceBranch: 'main',
            pullUrl: 'https://www.github.com/foo',
          },
        ]);

      // simulate commit is definitely not backported
      jest.spyOn(git, 'getIsCommitInBranch').mockResolvedValueOnce(false);

      return getCommitsWithoutBackports({
        options: {} as ValidConfigOptions,
        commit: {
          committedDate: '100',
          expectedTargetPullRequests: [],
          originalMessage: 'Second commit (#2)',
          sha: 'abc',
          sourceBranch: 'main',
        },
        targetBranch: '7.x',
        conflictingFiles: ['/foo/bar/baz.ts'],
      });
    }

    it('should display unbackported commits if no backports were created', async () => {
      const commitsWithoutBackports = await setup({
        expectedTargetPullRequests: [],
      });
      expect(commitsWithoutBackports[0].formatted).toEqual(
        ' - First commit (#1)\n   https://www.github.com/foo'
      );
    });

    it('should display as pending backport if a backport is OPEN', async () => {
      const commitsWithoutBackports = await setup({
        expectedTargetPullRequests: [{ state: 'OPEN', branch: '7.x' }],
      });
      expect(stripAnsi(commitsWithoutBackports[0].formatted)).toEqual(
        ' - First commit (#1) (backport pending)\n   https://www.github.com/foo'
      );
    });

    it('should not display commit as unbackported if a backport was MERGED', async () => {
      const commitsWithoutBackports = await setup({
        expectedTargetPullRequests: [{ state: 'MERGED', branch: '7.x' }],
      });
      expect(commitsWithoutBackports).toEqual([]);
    });
  });

  describe('commitDate', () => {
    function setup({
      offendingCommitDate,
      currentCommitDate,
    }: {
      offendingCommitDate: string;
      currentCommitDate: string;
    }) {
      // simulate 1 commit with a pending backport
      jest
        .spyOn(fetchCommitsByAuthorModule, 'fetchCommitsByAuthor')
        .mockResolvedValueOnce([
          {
            committedDate: offendingCommitDate,
            expectedTargetPullRequests: [],
            originalMessage: 'First commit (#1)',
            sha: 'xyz',
            sourceBranch: 'main',
          },
        ]);

      // simulate commit is definitely not backported
      jest.spyOn(git, 'getIsCommitInBranch').mockResolvedValueOnce(false);

      return getCommitsWithoutBackports({
        options: {} as ValidConfigOptions,
        commit: {
          committedDate: currentCommitDate,
          expectedTargetPullRequests: [],
          originalMessage: 'Second commit (#2)',
          sha: 'abc',
          sourceBranch: 'main',
        },
        targetBranch: '7.x',
        conflictingFiles: ['/foo/bar/baz.ts'],
      });
    }

    it('should not display commit as unbackport if is newer than the commit currently being backported', async () => {
      const commitsWithoutBackports = await setup({
        offendingCommitDate: '100',
        currentCommitDate: '10',
      });
      expect(commitsWithoutBackports).toEqual([]);
    });

    it('should display commit as unbackport if is older than the commit currently being backported', async () => {
      const commitsWithoutBackports = await setup({
        offendingCommitDate: '10',
        currentCommitDate: '100',
      });
      expect(commitsWithoutBackports[0].formatted).toEqual(
        ' - First commit (#1)'
      );
    });
  });

  describe('isCommitInBranch', () => {
    function setup({ isCommitInBranch }: { isCommitInBranch: boolean }) {
      // simulate 1 unbackported commit
      jest
        .spyOn(fetchCommitsByAuthorModule, 'fetchCommitsByAuthor')
        .mockResolvedValueOnce([
          {
            committedDate: '10',
            expectedTargetPullRequests: [],
            originalMessage: 'First commit (#1)',
            sha: 'xyz',
            sourceBranch: 'main',
          },
        ]);

      // simulate commit is definitely not backported
      jest
        .spyOn(git, 'getIsCommitInBranch')
        .mockResolvedValueOnce(isCommitInBranch);

      return getCommitsWithoutBackports({
        options: {} as ValidConfigOptions,
        commit: {
          committedDate: '100',
          expectedTargetPullRequests: [],
          originalMessage: 'Second commit (#2)',
          sha: 'abc',
          sourceBranch: 'main',
        },
        targetBranch: '7.x',
        conflictingFiles: ['/foo/bar/baz.ts'],
      });
    }

    it('should not display commit as unbackport if `isCommitInBranch=true`', async () => {
      const commitsWithoutBackports = await setup({ isCommitInBranch: true });
      expect(commitsWithoutBackports).toEqual([]);
    });

    it('should display commit as unbackport if `isCommitInBranch=false`', async () => {
      const commitsWithoutBackports = await setup({ isCommitInBranch: false });
      expect(commitsWithoutBackports[0].formatted).toEqual(
        ' - First commit (#1)'
      );
    });
  });

  describe('targetBranch', () => {
    function setup({
      offendingCommitTargetBranch,
      currentCommitTargetBranch,
    }: {
      offendingCommitTargetBranch: string;
      currentCommitTargetBranch: string;
    }) {
      // simulate 1 commit with a pending backport
      jest
        .spyOn(fetchCommitsByAuthorModule, 'fetchCommitsByAuthor')
        .mockResolvedValueOnce([
          {
            committedDate: '10',
            expectedTargetPullRequests: [
              { branch: offendingCommitTargetBranch, state: 'OPEN' },
            ],
            originalMessage: 'First commit (#1)',
            sha: 'xyz',
            sourceBranch: 'main',
          },
        ]);

      // simulate commit is definitely not backported
      jest.spyOn(git, 'getIsCommitInBranch').mockResolvedValueOnce(false);

      return getCommitsWithoutBackports({
        options: {} as ValidConfigOptions,
        commit: {
          committedDate: '100',
          expectedTargetPullRequests: [],
          originalMessage: 'Second commit (#2)',
          sha: 'abc',
          sourceBranch: 'main',
        },
        targetBranch: currentCommitTargetBranch,
        conflictingFiles: ['/foo/bar/baz.ts'],
      });
    }

    it('should display backport as pending if target branches match', async () => {
      const commitsWithoutBackports = await setup({
        offendingCommitTargetBranch: '7.x',
        currentCommitTargetBranch: '7.x',
      });
      expect(stripAnsi(commitsWithoutBackports[0].formatted)).toEqual(
        ' - First commit (#1) (backport pending)'
      );
    });

    it("should not display backport as pending if target branches don't match", async () => {
      const commitsWithoutBackports = await setup({
        offendingCommitTargetBranch: '7.x',
        currentCommitTargetBranch: '8.x',
      });
      expect(stripAnsi(commitsWithoutBackports[0].formatted)).toEqual(
        ' - First commit (#1)'
      );
    });
  });
});

function setupExecSpyForCherryPick() {
  let conflictingFilesCheck = 0;
  let unstagedFilesCheck = 0;
  return jest
    .spyOn(childProcess, 'exec')

    .mockImplementation(async (cmd) => {
      // createFeatureBranch
      if (cmd.includes('git checkout -B')) {
        return { stdout: 'create feature branch succeeded', stderr: '' };
      }

      // git fetch
      if (cmd.startsWith('git fetch')) {
        return { stderr: '', stdout: '' };
      }

      // cherrypick
      if (cmd === 'git cherry-pick -x mySha') {
        throw new ExecError({ cmd });
      }

      // getIsCommitInBranch
      if (cmd.startsWith('git merge-base --is-ancestor')) {
        return { stderr: '', stdout: '' };
      }

      // getConflictingFiles
      if (cmd === 'git --no-pager diff --check') {
        conflictingFilesCheck++;
        if (conflictingFilesCheck >= 4) {
          return { stderr: '', stdout: '' };
        }

        throw new ExecError({
          code: 2,
          cmd,
          stdout: `conflicting-file.txt:1: leftover conflict marker\nconflicting-file.txt:3: leftover conflict marker\nconflicting-file.txt:5: leftover conflict marker\n`,
        });
      }

      // getUnstagedFiles
      if (cmd === 'git --no-pager diff --name-only') {
        unstagedFilesCheck++;
        if (unstagedFilesCheck >= 5) {
          return { stderr: '', stdout: '' };
        }
        return { stdout: `conflicting-file.txt\n`, stderr: '' };
      }

      // addUnstagedFiles
      if (cmd === 'git add --update') {
        return { stdout: ``, stderr: '' };
      }

      // finalizeCherrypick
      if (cmd.includes('git commit --no-edit')) {
        return { stdout: ``, stderr: '' };
      }

      // pushFeatureBranch
      if (cmd.startsWith('git push ')) {
        return { stdout: ``, stderr: '' };
      }

      // deleteFeatureBranch
      if (cmd.includes('git branch -D ')) {
        return { stdout: ``, stderr: '' };
      }

      throw new Error(`Missing exec mock for "${cmd}"`);
    });
}
