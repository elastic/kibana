import axios from 'axios';
import { BackportOptions } from '../options/options';
import * as prompts from '../services/prompts';
import { cherrypickAndCreatePullRequest } from './cherrypickAndCreatePullRequest';
import * as childProcess from '../services/child-process-promisified';
import * as logger from '../services/logger';
import dedent from 'dedent';
import ora from 'ora';
import { PromiseReturnType } from '../types/PromiseReturnType';
import { CommitSelected } from '../services/github/Commit';

type ExecReturnType = PromiseReturnType<typeof childProcess.exec>;

describe('cherrypickAndCreatePullRequest', () => {
  let axiosPostMock: jest.SpyInstance;

  beforeEach(() => {
    axiosPostMock = jest
      .spyOn(axios, 'post')

      // mock: createPullRequest
      .mockResolvedValueOnce({
        data: {
          number: 1337,
          html_url: 'myHtmlUrl',
        },
      })

      // mock: addLabelsToPullRequest
      .mockResolvedValueOnce(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when commit has a pull request reference', () => {
    let execSpy: jest.SpyInstance;
    beforeEach(async () => {
      execSpy = jest
        .spyOn(childProcess, 'exec')
        .mockResolvedValue({ stdout: '' } as ExecReturnType);

      const options = {
        githubApiBaseUrlV3: 'https://api.github.com',
        fork: true,
        labels: ['backport'],
        prDescription: 'myPrSuffix',
        prTitle: '[{baseBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        username: 'sqren',
        sourceBranch: 'myDefaultRepoBaseBranch',
      } as BackportOptions;

      const commits: CommitSelected[] = [
        {
          branch: '7.x',
          sha: 'mySha',
          formattedMessage: 'myCommitMessage (#1000)',
          pullNumber: 1000,
        },
        {
          branch: '7.x',
          sha: 'mySha2',
          formattedMessage: 'myOtherCommitMessage (#2000)',
          pullNumber: 2000,
        },
      ];

      await cherrypickAndCreatePullRequest({
        options,
        commits,
        baseBranch: '6.x',
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
            "Cherry-picking commit mySha",
          ],
          Array [
            "Cherry-picking commit mySha2",
          ],
          Array [
            "Pushing branch \\"sqren:backport/6.x/pr-1000_pr-2000\\"",
          ],
          Array [
            "Creating pull request",
          ],
        ]
      `);
    });

    it('should create pull request', () => {
      expect(axiosPostMock).toHaveBeenCalledTimes(2);
      const [apiEndpoint, payload] = axiosPostMock.mock.calls[0];
      expect(apiEndpoint).toBe(
        'https://api.github.com/repos/elastic/kibana/pulls'
      );
      expect(payload.title).toBe(
        '[6.x] myCommitMessage (#1000) | myOtherCommitMessage (#2000)'
      );
      expect(payload.body).toBe(
        dedent(`Backports the following commits to 6.x:
   - myCommitMessage (#1000)
   - myOtherCommitMessage (#2000)

  myPrSuffix`)
      );
      expect(payload.head).toBe('sqren:backport/6.x/pr-1000_pr-2000');
      expect(payload.base).toBe('6.x');
    });

    it('it should add labels', () => {
      const [apiEndpoint, labels] = axiosPostMock.mock.calls[1];

      expect(apiEndpoint).toBe(
        'https://api.github.com/repos/elastic/kibana/issues/1337/labels'
      );
      expect(labels).toEqual(['backport']);
    });
  });

  describe('when commit does not have a pull request reference', () => {
    beforeEach(async () => {
      const options = {
        githubApiBaseUrlV3: 'https://api.github.com',
        fork: true,
        labels: ['backport'],
        prTitle: '[{baseBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        username: 'sqren',
      } as BackportOptions;

      await cherrypickAndCreatePullRequest({
        options,
        commits: [
          {
            branch: '7.x',
            sha: 'mySha',
            formattedMessage: 'myCommitMessage (mySha)',
          },
        ],
        baseBranch: '6.x',
      });
    });

    it('should create pull request', () => {
      expect(axiosPostMock).toHaveBeenCalledTimes(2);
      const [apiEndpoint, payload] = axiosPostMock.mock.calls[0];
      expect(apiEndpoint).toBe(
        'https://api.github.com/repos/elastic/kibana/pulls'
      );
      expect(payload.title).toBe('[6.x] myCommitMessage (mySha)');
      expect(payload.body).toBe(
        `Backports the following commits to 6.x:
 - myCommitMessage (mySha)`
      );
      expect(payload.head).toBe('sqren:backport/6.x/commit-mySha');
      expect(payload.base).toBe('6.x');
    });

    it('it should add labels', () => {
      const [apiEndpoint, labels] = axiosPostMock.mock.calls[1];

      expect(apiEndpoint).toBe(
        'https://api.github.com/repos/elastic/kibana/issues/1337/labels'
      );
      expect(labels).toEqual(['backport']);
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
        fork: true,
        labels: ['backport'],
        prTitle: '[{baseBranch}] {commitMessages}',
        repoName: 'kibana',
        repoOwner: 'elastic',
        username: 'sqren',
        sourceBranch: 'myDefaultRepoBaseBranch',
      } as BackportOptions;

      const res = await runTimers(() =>
        cherrypickAndCreatePullRequest({
          options,
          commits: [
            {
              branch: '7.x',
              sha: 'mySha',
              formattedMessage: 'myCommitMessage',
            },
          ],
          baseBranch: '6.x',
        })
      );

      expect(res).toEqual({
        html_url: 'myHtmlUrl',
        number: 1337,
      });

      expect(promptSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[0mThe following files will be staged and committed:[0m
        [0m - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt[0m
        [0m - /myHomeDir/.backport/repositories/elastic/kibana/another-conflicting-file.js[0m

        Press ENTER to continue...",
          ],
        ]
      `);

      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "
        [1mBackporting the following commits to 6.x:[22m
         - myCommitMessage
        ",
          ],
        ]
      `);
      expect((ora as any).mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Pulling latest changes",
          ],
          Array [
            "Cherry-picking commit mySha",
          ],
          Array [
            "Waiting for conflicts to be resolved",
          ],
          Array [
            "Staging and committing files",
          ],
          Array [
            "Pushing branch \\"sqren:backport/6.x/commit-mySha\\"",
          ],
          Array [
            "Creating pull request",
          ],
        ]
      `);
      expect(execSpy.mock.calls).toMatchSnapshot();
      expect(axiosPostMock).toHaveBeenCalledTimes(2);
    });
  });
});

function setupExecSpy() {
  let conflictCheckCounts = 0;
  return jest
    .spyOn(childProcess, 'exec')

    .mockImplementation((async (cmd) => {
      // createFeatureBranch
      if (cmd.includes('git checkout -B')) {
        return { stdout: 'create feature branch succeeded' };
      }

      // cherrypick
      if (cmd.includes('git cherry-pick mySha')) {
        throw new Error('cherrypick failed');
      }

      // filesWithConflicts
      if (cmd === 'git --no-pager diff --check') {
        conflictCheckCounts++;
        if (conflictCheckCounts >= 4) {
          return {};
        }
        const e = new Error('cherrypick failed');
        // @ts-ignore
        e.code = 2;
        // @ts-ignore
        e.stdout = `conflicting-file.txt:1: leftover conflict marker\nconflicting-file.txt:3: leftover conflict marker\nconflicting-file.txt:5: leftover conflict marker\n`;
        throw e;
      }

      // getUnstagedFiles
      if (cmd === 'git add --update --dry-run') {
        return {
          stdout: `add 'conflicting-file.txt'\nadd 'another-conflicting-file.js'\n`,
        };
      }

      // addUnstagedFiles
      if (cmd === 'git add --update') {
        return { stdout: `` };
      }

      // cherrypickContinue
      if (cmd.includes('cherry-pick --continue')) {
        return { stdout: `` };
      }

      // pushFeatureBranch
      if (cmd.startsWith('git push ')) {
        return { stdout: `` };
      }

      // deleteFeatureBranch
      if (cmd.includes('git branch -D ')) {
        return { stdout: `` };
      }

      throw new Error(`Missing mock for "${cmd}"`);
    }) as typeof childProcess.exec);
}

async function runTimers(fn: () => Promise<any>) {
  jest.useFakeTimers();

  const p = fn();
  await new Promise((resolve) => setImmediate(resolve));
  jest.advanceTimersByTime(1000);
  jest.runOnlyPendingTimers();

  return p;
}
