import os from 'os';
import nock from 'nock';
import ora from 'ora';
import { ValidConfigOptions } from '../options/options';
import * as childProcess from '../services/child-process-promisified';
import * as fetchCommitsByAuthorModule from '../services/github/v4/fetchCommits/fetchCommitsByAuthor';
import { commitsByAuthorMock } from '../services/github/v4/mocks/commitsByAuthorMock';
import * as logger from '../services/logger';
import * as prompts from '../services/prompts';
import { Commit } from '../services/sourceCommit/parseSourceCommit';
import { ExecError } from '../test/ExecError';
import { listenForCallsToNockScope, mockGqlRequest } from '../test/nockHelpers';
import { SpyHelper } from '../types/SpyHelper';
import { cherrypickAndCreateTargetPullRequest } from './cherrypickAndCreateTargetPullRequest';

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
        author: 'sqren',
        fork: true,
        prTitle: '[{targetBranch}] {commitMessages}',
        repoForkOwner: 'sqren',
        repoName: 'kibana',
        repoOwner: 'elastic',
        reviewers: [] as string[],
        sourceBranch: 'myDefaultSourceBranch',
        sourcePRLabels: [] as string[],
        targetPRLabels: ['backport'],
      } as ValidConfigOptions;

      const commits: Commit[] = [
        {
          author: {
            email: 'soren.louv@elastic.co',
            name: 'Søren Louv-Jansen',
          },
          sourceBranch: '7.x',
          sourceCommit: {
            committedDate: 'fff',
            sha: 'mySha',
            message: 'My original commit message (#1000)',
          },
          sourcePullRequest: {
            url: 'foo',
            number: 1000,
            mergeCommit: {
              sha: 'mySha',
              message: 'My original commit message (#1000)',
            },
          },
          expectedTargetPullRequests: [],
        },
        {
          author: {
            email: 'soren.louv@elastic.co',
            name: 'Søren Louv-Jansen',
          },
          sourceBranch: '7.x',
          sourceCommit: {
            committedDate: 'ggg',
            sha: 'mySha2',
            message: 'My other commit message (#2000)',
          },
          sourcePullRequest: {
            url: 'foo',
            number: 2000,
            mergeCommit: {
              sha: 'mySha2',
              message: 'My other commit message (#2000)',
            },
          },
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

        This will backport the following commits from \`7.x\` to \`6.x\`:
         - [My original commit message (#1000)](foo)
         - [My other commit message (#2000)](foo)

        <!--- Backport version: 1.2.3-mocked -->

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)",
            "head": "sqren:backport/6.x/pr-1000_pr-2000",
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
      expect((ora as any).mock.calls.map((call: any) => call[0].text))
        .toMatchInlineSnapshot(`
        Array [
          "Pulling latest changes",
          "Cherry-picking: My original commit message (#1000)",
          "Cherry-picking: My other commit message (#2000)",
          "Pushing branch \\"sqren:backport/6.x/pr-1000_pr-2000\\"",
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
        author: 'sqren',
        fork: true,
        prTitle: '[{targetBranch}] {commitMessages}',
        repoForkOwner: 'the_fork_owner',
        repoName: 'kibana',
        repoOwner: 'elastic',
        reviewers: [] as string[],
        sourcePRLabels: [] as string[],
        targetPRLabels: ['backport'],
      } as ValidConfigOptions;

      const commits: Commit[] = [
        {
          author: {
            email: 'soren.louv@elastic.co',
            name: 'Søren Louv-Jansen',
          },
          sourceCommit: {
            committedDate: 'hhh',
            sha: 'mySha',
            message: 'My original commit message',
          },
          sourceBranch: '7.x',
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

        This will backport the following commits from \`7.x\` to \`6.x\`:
         - My original commit message (mySha)

        <!--- Backport version: 1.2.3-mocked -->

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)",
            "head": "the_fork_owner:backport/6.x/commit-mySha",
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
        author: 'sqren',
        fork: true,
        githubApiBaseUrlV4: 'http://localhost/graphql',
        prTitle: '[{targetBranch}] {commitMessages}',
        repoForkOwner: 'sqren',
        repoName: 'kibana',
        repoOwner: 'elastic',
        reviewers: [] as string[],
        sourceBranch: 'myDefaultSourceBranch',
        sourcePRLabels: [] as string[],
        targetPRLabels: ['backport'],
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
            author: {
              email: 'soren.louv@elastic.co',
              name: 'Søren Louv-Jansen',
            },
            sourceCommit: {
              committedDate: '2021-08-18T16:11:38Z',
              sha: 'mySha',
              message: 'My original commit message',
            },
            sourceBranch: '7.x',
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

        This will backport the following commits from \`7.x\` to \`6.x\`:
         - My original commit message (mySha)

        <!--- Backport version: 1.2.3-mocked -->

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)",
            "head": "sqren:backport/6.x/commit-mySha",
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
          "dateSince": null,
          "dateUntil": "2021-08-18T16:11:38Z",
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
      expect((ora as any).mock.calls.map((call: any) => call[0].text))
        .toMatchInlineSnapshot(`
        Array [
          "Pulling latest changes",
          "Cherry-picking: My original commit message",
          "Finalizing cherrypick",
          "Pushing branch \\"sqren:backport/6.x/commit-mySha\\"",
          undefined,
          "Creating pull request",
          "Adding labels: backport",
        ]
      `);
    });

    it('logs correctly', async () => {
      expect(consoleLogSpy.mock.calls.map((call) => call[0]).join(''))
        .toMatchInlineSnapshot(`
        "
        Backporting to 6.x:
        The commit could not be backported due to conflicts
        Please fix the conflicts in /myHomeDir/.backport/repositories/elastic/kibana
        ----------------------------------------

        ----------------------------------------

        ----------------------------------------
        View pull request: myHtmlUrl"
      `);
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

      // emulate cherrypick exception
      if (cmd.includes('cherry-pick -x mySha')) {
        throw new ExecError({ cmd, code: 128 });
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

      // getIsMergeCommit
      if (cmd.startsWith('git rev-list -1 --merges')) {
        return { stdout: ``, stderr: '' };
      }

      throw new Error(`Missing exec mock for "${cmd}"`);
    });
}
