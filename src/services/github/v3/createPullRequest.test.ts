import { ValidConfigOptions } from '../../../options/options';
import { getPullRequestBody, getTitle } from './createPullRequest';

describe('getPullRequestBody', () => {
  it('when single pull request is backported', () => {
    expect(
      getPullRequestBody({
        options: {} as ValidConfigOptions,
        commits: [
          {
            sourcePullRequest: {
              number: 55,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/55',
              mergeCommit: {
                sha: 'abcdefghi',
                message: 'My commit message (#55)',
              },
            },

            sourceCommit: {
              committedDate: '2020',
              sha: 'abcdefghi',
              message: 'My commit message (#55)',
            },

            expectedTargetPullRequests: [],
            sourceBranch: 'master',
          },
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This will backport the following commits from \`master\` to \`7.x\`:
       - [My commit message (#55)](https://github.com/backport-org/different-merge-strategies/pull/55)

      <!--- Backport version: 1.2.3-mocked -->

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
    `);
  });

  it('when a single commit (non pull request) is backported', () => {
    expect(
      getPullRequestBody({
        options: {} as ValidConfigOptions,
        commits: [
          {
            sourceCommit: {
              committedDate: '',
              sha: 'abcdefghijklmw',
              message: 'My commit message',
            },

            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This will backport the following commits from \`main\` to \`7.x\`:
       - My commit message (abcdefgh)

      <!--- Backport version: 1.2.3-mocked -->

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
    `);
  });

  it('when multiple commits are backported', () => {
    expect(
      getPullRequestBody({
        options: {} as ValidConfigOptions,
        commits: [
          {
            sourcePullRequest: {
              number: 55,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/55',
              mergeCommit: {
                sha: 'abcdefghijklm',
                message: 'My commit message (#55)',
              },
            },

            sourceCommit: {
              committedDate: '',
              sha: 'abcdefghijklm',
              message: 'My commit message (#55)',
            },

            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },

          {
            sourceCommit: {
              committedDate: '',
              sha: 'qwertyuiop',
              message: 'Another commit message',
            },

            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This will backport the following commits from \`main\` to \`7.x\`:
       - [My commit message (#55)](https://github.com/backport-org/different-merge-strategies/pull/55)
       - Another commit message (qwertyui)

      <!--- Backport version: 1.2.3-mocked -->

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
    `);
  });

  it('when a PR is merged (instead of squashed) and the individual commits are selected', () => {
    expect(
      getPullRequestBody({
        options: {} as ValidConfigOptions,
        commits: [
          {
            sourceCommit: {
              committedDate: '2022-02-07T23:53:14Z',
              message: 'Merge strategy: Second commit',
              sha: 'e8df5eaa4db7b94474b48e2320b02d33a830d9fb',
            },

            sourcePullRequest: {
              number: 1,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/1',
              mergeCommit: {
                message:
                  'Merge pull request #1 from backport-org/merge-strategy\n\nMerge commits to `main`',
                sha: '0db7f1ac1233461563d8708511d1c14adbab46da',
              },
            },

            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },

          {
            sourceCommit: {
              committedDate: '2022-02-07T23:51:59Z',
              message: 'Merge strategy: First commit',
              sha: '5411b1c1144093e422220008f23f2c2b909ed113',
            },

            sourcePullRequest: {
              number: 1,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/1',
              mergeCommit: {
                message:
                  'Merge pull request #1 from backport-org/merge-strategy\n\nMerge commits to `main`',
                sha: '0db7f1ac1233461563d8708511d1c14adbab46da',
              },
            },

            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This will backport the following commits from \`main\` to \`7.x\`:
       - [Merge strategy: Second commit](https://github.com/backport-org/different-merge-strategies/pull/1)
       - [Merge strategy: First commit](https://github.com/backport-org/different-merge-strategies/pull/1)

      <!--- Backport version: 1.2.3-mocked -->

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
    `);
  });

  it('replaces template variables in PR description', () => {
    expect(
      getPullRequestBody({
        options: {
          prDescription:
            'Backporting the following to {targetBranch}:\n{commitMessages}',
        } as ValidConfigOptions,
        commits: [
          {
            sourcePullRequest: {
              number: 55,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/55',
              mergeCommit: {
                sha: 'abcdefghijklm',
                message: 'My commit message (#55)',
              },
            },
            sourceCommit: {
              committedDate: '',
              sha: 'abcdefghijklm',
              message: 'My commit message (#55)',
            },
            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },
          {
            sourceCommit: {
              committedDate: '',
              sha: 'qwertyuiop',
              message: 'Another commit message',
            },
            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "Backporting the following to 7.x:
       - [My commit message (#55)](https://github.com/backport-org/different-merge-strategies/pull/55)
       - Another commit message (qwertyui)"
    `);
  });

  it('appends text to the default descriptions', () => {
    expect(
      getPullRequestBody({
        options: {
          prDescription: '{defaultPrDescription}\n\ntext to append',
        } as ValidConfigOptions,
        commits: [
          {
            sourcePullRequest: {
              number: 55,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/55',
              mergeCommit: {
                sha: 'abcdefghijklm',
                message: 'My commit message (#55)',
              },
            },

            sourceCommit: {
              committedDate: '',
              sha: 'abcdefghijklm',
              message: 'My commit message (#55)',
            },

            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },

          {
            sourceCommit: {
              committedDate: '',
              sha: 'qwertyuiop',
              message: 'Another commit message',
            },

            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This will backport the following commits from \`main\` to \`7.x\`:
       - [My commit message (#55)](https://github.com/backport-org/different-merge-strategies/pull/55)
       - Another commit message (qwertyui)

      <!--- Backport version: 1.2.3-mocked -->

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)

      text to append"
    `);
  });
});

describe('getTitle', () => {
  it('has the default title', () => {
    expect(
      getTitle({
        options: {} as ValidConfigOptions,
        commits: [
          {
            sourceBranch: 'main',
            sourcePullRequest: {
              number: 55,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/55',
              mergeCommit: {
                sha: 'abcdefghi',
                message: 'My commit message (#55)',
              },
            },
            sourceCommit: {
              committedDate: '2020',
              sha: 'abcdefghi',
              message: 'My commit message (#55)',
            },
            expectedTargetPullRequests: [],
          },
          {
            sourcePullRequest: {
              number: 56,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/56',
              mergeCommit: {
                sha: 'jklmnopqr',
                message: 'Another commit message (#56)',
              },
            },
            sourceCommit: {
              committedDate: '2020',
              sha: 'jklmnopqr',
              message: 'Another commit message (#56)',
            },
            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },
        ],
        targetBranch: '7.x',
      })
    ).toEqual('[7.x] My commit message (#55) | Another commit message (#56)');
  });

  it('replaces template variables in PR title', () => {
    expect(
      getTitle({
        options: {
          prTitle: 'Branch: "{targetBranch}". Messages: {commitMessages}',
        } as ValidConfigOptions,
        commits: [
          {
            sourcePullRequest: {
              number: 55,
              url: 'https://github.com/backport-org/different-merge-strategies/pull/55',
              mergeCommit: {
                sha: 'abcdefghi',
                message: 'My commit message (#55)',
              },
            },
            sourceCommit: {
              committedDate: '',
              sha: 'abcdefghi',
              message: 'My commit message (#55)',
            },
            sourceBranch: 'main',
            expectedTargetPullRequests: [],
          },
        ],
        targetBranch: '7.x',
      })
    ).toEqual('Branch: "7.x". Messages: My commit message (#55)');
  });
});
