import nock from 'nock';
import ora from 'ora';
import { ValidConfigOptions } from '../options/options';
import * as childProcess from '../services/child-process-promisified';
import { CommitByAuthorResponse } from '../services/github/v4/fetchCommits/fetchCommitsByAuthor';
import { commitsByAuthorMock } from '../services/github/v4/mocks/commitsByAuthorMock';
import * as logger from '../services/logger';
import * as prompts from '../services/prompts';
import { Commit } from '../services/sourceCommit/parseSourceCommit';
import { ExecError } from '../test/ExecError';
import { mockGqlRequest } from '../test/nockHelpers';
import { PromiseReturnType } from '../types/PromiseReturnType';
import { SpyHelper } from '../types/SpyHelper';
import { cherrypickAndCreateTargetPullRequest } from './cherrypickAndCreateTargetPullRequest';

describe('cherrypickAndCreateTargetPullRequest', () => {
  let execSpy: SpyHelper<typeof childProcess.exec>;
  let addLabelsScope: ReturnType<typeof nock>;
  let consoleLogSpy: SpyHelper<typeof logger['consoleLog']>;

  beforeEach(() => {
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
    let res: PromiseReturnType<typeof cherrypickAndCreateTargetPullRequest>;

    beforeEach(async () => {
      const options = {
        assignees: [] as string[],
        githubApiBaseUrlV3: 'https://api.github.com',
        fork: true,
        targetPRLabels: ['backport'],
        prDescription: 'myPrSuffix',
        prTitle: '[{targetBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        username: 'sqren',
        sourceBranch: 'myDefaultSourceBranch',
        sourcePRLabels: [] as string[],
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
        .post('/repos/elastic/kibana/pulls', {
          title:
            '[6.x] My original commit message (#1000) | My other commit message (#2000)',
          head: 'sqren:backport/6.x/pr-1000_pr-2000',
          base: '6.x',
          body: 'Backports the following commits to 6.x:\n - #1000\n - #2000\n\nmyPrSuffix',
        })
        .reply(200, { number: 1337, html_url: 'myHtmlUrl' });

      res = await cherrypickAndCreateTargetPullRequest({
        options,
        commits,
        targetBranch: '6.x',
      });

      scope.done();
      nock.cleanAll();
    });

    it('returns the expected response', () => {
      expect(res).toEqual({ url: 'myHtmlUrl', number: 1337 });
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
          "Pushing branch \\"sqren:backport/6.x/pr-1000_pr-2000\\"",
          undefined,
          "Creating pull request",
          "Adding labels: backport",
        ]
      `);
    });
  });

  describe('when commit does not have a pull request reference', () => {
    let res: PromiseReturnType<typeof cherrypickAndCreateTargetPullRequest>;
    beforeEach(async () => {
      const options = {
        assignees: [] as string[],
        githubApiBaseUrlV3: 'https://api.github.com',
        fork: true,
        targetPRLabels: ['backport'],
        prTitle: '[{targetBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        username: 'sqren',
        sourcePRLabels: [] as string[],
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
        .post('/repos/elastic/kibana/pulls', {
          title: '[6.x] My original commit message',
          head: 'sqren:backport/6.x/commit-mySha',
          base: '6.x',
          body: 'Backports the following commits to 6.x:\n - My original commit message (mySha)',
        })
        .reply(200, { number: 1337, html_url: 'myHtmlUrl' });

      res = await cherrypickAndCreateTargetPullRequest({
        options,
        commits,
        targetBranch: '6.x',
      });
      scope.done();
      nock.cleanAll();
    });

    it('returns the expected response', () => {
      expect(res).toEqual({ url: 'myHtmlUrl', number: 1337 });
    });
  });

  describe('when cherry-picking fails', () => {
    let res: PromiseReturnType<typeof cherrypickAndCreateTargetPullRequest>;
    let promptSpy: SpyHelper<typeof prompts['confirmPrompt']>;
    let execSpy: ReturnType<typeof setupExecSpy>;
    let commitsByAuthorCalls: ReturnType<typeof mockGqlRequest>;

    beforeEach(async () => {
      // spies
      promptSpy = jest.spyOn(prompts, 'confirmPrompt').mockResolvedValue(true);
      execSpy = setupExecSpy();

      const options = {
        assignees: [] as string[],
        fork: true,
        githubApiBaseUrlV4: 'http://localhost/graphql',
        prTitle: '[{targetBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        sourceBranch: 'myDefaultSourceBranch',
        sourcePRLabels: [] as string[],
        targetPRLabels: ['backport'],
        username: 'sqren',
      } as ValidConfigOptions;

      const scope = nock('https://api.github.com')
        .post('/repos/elastic/kibana/pulls', {
          title: '[6.x] My original commit message',
          head: 'sqren:backport/6.x/commit-mySha',
          base: '6.x',
          body: 'Backports the following commits to 6.x:\n - My original commit message (mySha)',
        })
        .reply(200, { html_url: 'myHtmlUrl', number: 1337 });

      commitsByAuthorCalls = mockGqlRequest<CommitByAuthorResponse>({
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

    it('creates pull request', () => {
      expect(res).toEqual({ url: 'myHtmlUrl', number: 1337 });
    });

    it('shows the right prompts', () => {
      expect(promptSpy.mock.calls.length).toBe(3);

      expect(promptSpy.mock.calls[0][0]).toMatchInlineSnapshot(`
        "Fix the following conflicts manually

        Conflicting files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt


        Press ENTER when the conflicts are resolved and files are staged"
      `);

      expect(promptSpy.mock.calls[1][0]).toMatchInlineSnapshot(`
        "Fix the following conflicts manually


        Unstaged files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt

        Press ENTER when the conflicts are resolved and files are staged"
      `);

      expect(promptSpy.mock.calls[2][0]).toMatchInlineSnapshot(`
        "Fix the following conflicts manually


        Unstaged files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt

        Press ENTER when the conflicts are resolved and files are staged"
      `);
    });

    it('commitsByAuthor is called with correct arguments', () => {
      expect(commitsByAuthorCalls[0].variables).toMatchInlineSnapshot(`
        Object {
          "authorId": null,
          "commitPath": "conflicting-file.txt",
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
          "Pushing branch \\"sqren:backport/6.x/commit-mySha\\"",
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

function setupExecSpy() {
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
      if (cmd === 'git cherry-pick mySha') {
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
