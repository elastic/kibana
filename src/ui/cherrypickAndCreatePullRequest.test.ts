import axios from 'axios';
import dedent from 'dedent';
import ora from 'ora';
import { BackportOptions } from '../options/options';
import * as childProcess from '../services/child-process-promisified';
import * as logger from '../services/logger';
import * as prompts from '../services/prompts';
import { ExecError } from '../test/ExecError';
import { CommitSelected } from '../types/Commit';
import { SpyHelper } from '../types/SpyHelper';
import { cherrypickAndCreateTargetPullRequest } from './cherrypickAndCreateTargetPullRequest';

describe('cherrypickAndCreateTargetPullRequest', () => {
  let axiosRequestSpy: SpyHelper<typeof axios.request>;

  beforeEach(() => {
    axiosRequestSpy = jest
      .spyOn(axios, 'request')

      // mock: createPullRequest
      .mockResolvedValueOnce({
        data: {
          number: 1337,
          html_url: 'myHtmlUrl',
        },
      })

      // mock: addLabelsToPullRequest
      .mockResolvedValueOnce({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when commit has a pull request reference', () => {
    let execSpy: SpyHelper<typeof childProcess.exec>;
    beforeEach(async () => {
      execSpy = jest
        .spyOn(childProcess, 'exec')

        // mock all exec commands to respond without errors
        .mockResolvedValue({ stdout: '', stderr: '' });

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
      } as BackportOptions;

      const commits: CommitSelected[] = [
        {
          sourceBranch: '7.x',
          sha: 'mySha',
          formattedMessage: 'myCommitMessage (#1000)',
          pullNumber: 1000,
          targetBranchesFromLabels: [],
        },
        {
          sourceBranch: '7.x',
          sha: 'mySha2',
          formattedMessage: 'myOtherCommitMessage (#2000)',
          pullNumber: 2000,
          targetBranchesFromLabels: [],
        },
      ];

      await cherrypickAndCreateTargetPullRequest({
        options,
        commits,
        targetBranch: '6.x',
      });
    });

    it('should make correct git commands', () => {
      expect(execSpy.mock.calls).toMatchSnapshot();
    });

    it('should start the spinner with the correct text', () => {
      expect((ora as any).mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Pulling latest changes",
          ],
          Array [
            "Cherry-picking: myCommitMessage (#1000)",
          ],
          Array [
            "Cherry-picking: myOtherCommitMessage (#2000)",
          ],
          Array [
            "Pushing branch \\"sqren:backport/6.x/pr-1000_pr-2000\\"",
          ],
          Array [],
          Array [
            "Creating pull request",
          ],
          Array [
            "Adding labels: backport",
          ],
        ]
      `);
    });

    it('should create pull request', () => {
      expect(axiosRequestSpy).toHaveBeenCalledTimes(2);
      const config = axiosRequestSpy.mock.calls[0][0];
      expect(config.url).toBe(
        'https://api.github.com/repos/elastic/kibana/pulls'
      );
      expect(config.data.title).toBe(
        '[6.x] myCommitMessage (#1000) | myOtherCommitMessage (#2000)'
      );
      expect(config.data.body).toBe(
        dedent(`Backports the following commits to 6.x:
   - myCommitMessage (#1000)
   - myOtherCommitMessage (#2000)

  myPrSuffix`)
      );
      expect(config.data.head).toBe('sqren:backport/6.x/pr-1000_pr-2000');
      expect(config.data.base).toBe('6.x');
    });

    it('it should add labels', () => {
      const config = axiosRequestSpy.mock.calls[1][0];

      expect(config.url).toBe(
        'https://api.github.com/repos/elastic/kibana/issues/1337/labels'
      );
      expect(config.data).toEqual(['backport']);
    });
  });

  describe('when commit does not have a pull request reference', () => {
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
      } as BackportOptions;

      await cherrypickAndCreateTargetPullRequest({
        options,
        commits: [
          {
            sourceBranch: '7.x',
            sha: 'mySha',
            formattedMessage: 'myCommitMessage (mySha)',
            targetBranchesFromLabels: [],
          },
        ],
        targetBranch: '6.x',
      });
    });

    it('should create pull request', () => {
      expect(axiosRequestSpy).toHaveBeenCalledTimes(2);
      const config = axiosRequestSpy.mock.calls[0][0];

      expect(config.url).toBe(
        'https://api.github.com/repos/elastic/kibana/pulls'
      );
      expect(config.data.title).toBe('[6.x] myCommitMessage (mySha)');
      expect(config.data.body).toBe(
        `Backports the following commits to 6.x:
 - myCommitMessage (mySha)`
      );
      expect(config.data.head).toBe('sqren:backport/6.x/commit-mySha');
      expect(config.data.base).toBe('6.x');
    });

    it('it should add labels', () => {
      const config = axiosRequestSpy.mock.calls[1][0];

      expect(config.url).toBe(
        'https://api.github.com/repos/elastic/kibana/issues/1337/labels'
      );
      expect(config.data).toEqual(['backport']);
    });
  });

  describe('when cherry-picking fails', () => {
    it('should start conflict resolution mode', async () => {
      // spies
      const promptSpy = jest
        .spyOn(prompts, 'confirmPrompt')
        .mockResolvedValue(true);
      const logSpy = jest.spyOn(logger, 'consoleLog');
      const execSpy = setupExecSpy();

      const options = {
        assignees: [] as string[],
        fork: true,
        targetPRLabels: ['backport'],
        prTitle: '[{targetBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        username: 'sqren',
        sourceBranch: 'myDefaultSourceBranch',
        sourcePRLabels: [] as string[],
      } as BackportOptions;

      const res = await cherrypickAndCreateTargetPullRequest({
        options,
        commits: [
          {
            sourceBranch: '7.x',
            sha: 'mySha',
            formattedMessage: 'myCommitMessage',
            targetBranchesFromLabels: [],
          },
        ],
        targetBranch: '6.x',
      });

      expect(res).toEqual({
        html_url: 'myHtmlUrl',
        number: 1337,
      });

      expect(promptSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Please fix the issues in: /myHomeDir/.backport/repositories/elastic/kibana

        Conflicting files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt


        Press ENTER when the conflicts are resolved and files are staged",
          ],
          Array [
            "Please fix the issues in: /myHomeDir/.backport/repositories/elastic/kibana

        Conflicting files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt


        Press ENTER when the conflicts are resolved and files are staged",
          ],
          Array [
            "Please fix the issues in: /myHomeDir/.backport/repositories/elastic/kibana


        Unstaged files:
         - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt

        Press ENTER when the conflicts are resolved and files are staged",
          ],
        ]
      `);

      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "
        Backporting to 6.x:",
          ],
          Array [
            "
        ----------------------------------------
        ",
          ],
          Array [
            "
        ----------------------------------------
        ",
          ],
          Array [
            "View pull request: myHtmlUrl",
          ],
        ]
      `);
      expect((ora as any).mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Pulling latest changes",
          ],
          Array [
            "Cherry-picking: myCommitMessage",
          ],
          Array [
            "Finalizing cherrypick",
          ],
          Array [
            "Pushing branch \\"sqren:backport/6.x/commit-mySha\\"",
          ],
          Array [],
          Array [
            "Creating pull request",
          ],
          Array [
            "Adding labels: backport",
          ],
        ]
      `);
      expect(execSpy.mock.calls).toMatchSnapshot();
      expect(axiosRequestSpy).toHaveBeenCalledTimes(2);
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

      throw new Error(`Missing mock for "${cmd}"`);
    });
}
