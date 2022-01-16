import { ValidConfigOptions } from '../../../options/options';
import { Commit } from '../../sourceCommit/parseSourceCommit';
import { getPullRequestBody, getTitle } from './createPullRequest';

describe('getPullRequestBody', () => {
  it('when single pull request is backported', () => {
    expect(
      getPullRequestBody({
        options: {} as ValidConfigOptions,
        commits: [
          {
            pullNumber: 55,
            sha: 'abcdefghi',
            originalMessage: 'My commit message',
          } as Commit,
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This is an automatic backport to \`7.x\` of:
       - #55

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
            sha: 'abcdefghijklmw',
            originalMessage: 'My commit message',
          } as Commit,
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This is an automatic backport to \`7.x\` of:
       - My commit message (abcdefgh)

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
            pullNumber: 55,
            sha: 'abcdefghijklm',
            originalMessage: 'My commit message',
          } as Commit,
          {
            sha: 'qwertyuiop',
            originalMessage: 'Another commit message',
          } as Commit,
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This is an automatic backport to \`7.x\` of:
       - #55
       - Another commit message (qwertyui)

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
            pullNumber: 55,
            sha: 'abcdefghijklm',
            originalMessage: 'My commit message',
          } as Commit,
          {
            sha: 'qwertyuiop',
            originalMessage: 'Another commit message',
          } as Commit,
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "Backporting the following to 7.x:
       - #55
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
            pullNumber: 55,
            sha: 'abcdefghijklm',
            originalMessage: 'My commit message',
          } as Commit,
          {
            sha: 'qwertyuiop',
            originalMessage: 'Another commit message',
          } as Commit,
        ],

        targetBranch: '7.x',
      })
    ).toMatchInlineSnapshot(`
      "# Backport

      This is an automatic backport to \`7.x\` of:
       - #55
       - Another commit message (qwertyui)

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
            pullNumber: 55,
            sha: 'abcdefghi',
            originalMessage: 'My commit message',
          } as Commit,
          {
            pullNumber: 56,
            sha: 'jklmnopqr',
            originalMessage: 'Another commit message',
          } as Commit,
        ],
        targetBranch: '7.x',
      })
    ).toEqual('[7.x] My commit message | Another commit message');
  });

  it('replaces template variables in PR title', () => {
    expect(
      getTitle({
        options: {
          prTitle: 'Branch: "{targetBranch}". Messages: {commitMessages}',
        } as ValidConfigOptions,
        commits: [
          {
            pullNumber: 55,
            sha: 'abcdefghi',
            originalMessage: 'My commit message',
          } as Commit,
        ],

        targetBranch: '7.x',
      })
    ).toEqual('Branch: "7.x". Messages: My commit message');
  });
});
