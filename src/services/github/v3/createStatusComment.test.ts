import { BackportResponse } from '../../../main';
import { ValidConfigOptions } from '../../../options/options';
import { HandledError } from '../../HandledError';
import { getCommentBody } from './createStatusComment';

describe('getCommentBody', () => {
  it('when an unknown error occurs', () => {
    expect(
      getCommentBody({
        options: {} as ValidConfigOptions,
        pullNumber: 55,
        backportResponse: {
          status: 'failure',
          errorMessage: 'A terrible error occured',
        } as BackportResponse,
      })
    ).toMatchInlineSnapshot(`
      "## 💔 Backport failed
      The pull request could not be backported due to the following error:
      \`A terrible error occured\`

      To backport manually run: \`node scripts/backport --pr 55\`.
      For more info read the [Backport documentation](https://github.com/sqren/backport#backport)
      "
    `);
  });

  it('when all backports succeed', () => {
    expect(
      getCommentBody({
        options: {
          repoName: 'kibana',
          repoOwner: 'elastic',
          autoMerge: true,
        } as ValidConfigOptions,
        pullNumber: 55,
        backportResponse: {
          status: 'success',
          results: [
            {
              status: 'success',
              targetBranch: '7.x',
              pullRequestNumber: 55,
              pullRequestUrl: 'url-to-pr',
            },

            {
              status: 'success',
              targetBranch: '7.1',
              pullRequestNumber: 66,
              pullRequestUrl: 'url-to-pr',
            },
          ],
        } as BackportResponse,
      })
    ).toMatchInlineSnapshot(`
      "## 💚 All backports created successfully

      | Status | Branch | Result |
      |:------:|:------:|:------:|
      |✅|7.x|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/55\\">](url-to-pr)|
      |✅|7.1|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/66\\">](url-to-pr)|

      Note: Successful backport PRs will be merged automatically after passing CI.
      "
    `);
  });

  it('when all backports fail', () => {
    expect(
      getCommentBody({
        options: {
          repoName: 'kibana',
          repoOwner: 'elastic',
          autoMerge: true,
        } as ValidConfigOptions,
        pullNumber: 55,
        backportResponse: {
          status: 'success',
          results: [
            {
              status: 'failure',
              targetBranch: '7.x',
              error: new Error('Boom!'),
              errorMessage: 'My boom error!',
            },

            {
              status: 'failure',
              targetBranch: '7.1',
              error: new Error('Boom!'),
              errorMessage: 'My boom error!',
            },
          ],
        } as BackportResponse,
      })
    ).toMatchInlineSnapshot(`
      "## 💔 Some backports could not be created

      | Status | Branch | Result |
      |:------:|:------:|:------:|
      |❌|7.x|My boom error!|
      |❌|7.1|My boom error!|

      To backport manually run: \`node scripts/backport --pr 55\`.
      For more info read the [Backport documentation](https://github.com/sqren/backport#backport)

      "
    `);
  });

  it('when some backports fail', () => {
    expect(
      getCommentBody({
        options: {
          repoName: 'kibana',
          repoOwner: 'elastic',
          autoMerge: true,
        } as ValidConfigOptions,
        pullNumber: 55,
        backportResponse: {
          status: 'success',
          results: [
            {
              status: 'success',
              targetBranch: '7.x',
              pullRequestNumber: 55,
              pullRequestUrl: 'url-to-pr-55',
            },

            {
              status: 'failure',
              targetBranch: '7.1',
              error: new Error('Boom!'),
              errorMessage: 'My boom error!',
            },
          ],
        } as BackportResponse,
      })
    ).toMatchInlineSnapshot(`
      "## 💔 Some backports could not be created

      | Status | Branch | Result |
      |:------:|:------:|:------:|
      |✅|7.x|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/55\\">](url-to-pr-55)|
      |❌|7.1|My boom error!|

      To backport manually run: \`node scripts/backport --pr 55\`.
      For more info read the [Backport documentation](https://github.com/sqren/backport#backport)

      Note: Successful backport PRs will be merged automatically after passing CI.
      "
    `);
  });

  it('when some backports fail due to conflicts', () => {
    expect(
      getCommentBody({
        options: {
          repoName: 'kibana',
          repoOwner: 'elastic',
          autoMerge: true,
        } as ValidConfigOptions,
        pullNumber: 55,
        backportResponse: {
          status: 'success',
          results: [
            {
              status: 'success',
              targetBranch: '7.x',
              pullRequestNumber: 55,
              pullRequestUrl: 'url-to-pr-55',
            },

            {
              status: 'failure',
              targetBranch: '7.1',
              errorMessage: 'My boom error!',
              error: new HandledError('Boom!', {
                type: 'commitsWithoutBackports',
                commitsWithoutBackports: [
                  {
                    //@ts-expect-error
                    commit: {
                      pullNumber: 5,
                      pullUrl: 'url-to-pr-5',
                    },
                  },
                ],
              }),
            },

            {
              status: 'failure',
              targetBranch: '7.2',
              errorMessage: 'My boom error!',
              error: new HandledError('Boom!', {
                type: 'commitsWithoutBackports',
                commitsWithoutBackports: [
                  {
                    //@ts-expect-error
                    commit: {
                      sha: 'acdefg',
                      originalMessage: 'Some long message\nin multiple lines',
                    },
                  },
                ],
              }),
            },
          ],
        } as BackportResponse,
      })
    ).toMatchInlineSnapshot(`
      "## 💔 Some backports could not be created

      | Status | Branch | Result |
      |:------:|:------:|:------:|
      |✅|7.x|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/55\\">](url-to-pr-55)|
      |❌|7.1|Could not backport due to conflicts, possibly caused by the following unbackported commits:<br> - [#5](url-to-pr-5)|
      |❌|7.2|Could not backport due to conflicts, possibly caused by the following unbackported commits:<br> - Some long message (acdefg)|

      To backport manually run: \`node scripts/backport --pr 55\`.
      For more info read the [Backport documentation](https://github.com/sqren/backport#backport)

      Note: Successful backport PRs will be merged automatically after passing CI.
      "
    `);
  });
});
