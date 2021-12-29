import { ValidConfigOptions } from '../../../options/options';
import { Commit } from '../../sourceCommit/parseSourceCommit';
import { getPullRequestBody } from './createPullRequest';

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
      "This is an automatic backport of pull request #55 to 7.x.

      Please refer to the [Backport tool documentation](https://github.com/sqren/backport) for additional information"
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
      "This is an automatic backport of commit abcdefghijklmw to 7.x.

      Please refer to the [Backport tool documentation](https://github.com/sqren/backport) for additional information"
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
      "This is an automatic backport of the following commits to 7.x:
       - #55
       - Another commit message (qwertyui)

      Please refer to the [Backport tool documentation](https://github.com/sqren/backport) for additional information"
    `);
  });
});
