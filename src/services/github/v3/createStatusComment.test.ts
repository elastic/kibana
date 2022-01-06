import { BackportResponse } from '../../../main';
import { ValidConfigOptions } from '../../../options/options';
import { HandledError } from '../../HandledError';
import { getCommentBody } from './createStatusComment';

describe('getCommentBody', () => {
  it('when an unknown error occurs', () => {
    expect(
      getCommentBody({
        options: {
          backportBinary: 'node scripts/backport',
        } as ValidConfigOptions,
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

      ## How to fix

      Re-run the backport manually:
      \`\`\`
      node scripts/backport --pr 55
      \`\`\`

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
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
      |:------:|:------:|:------|
      |✅|7.x|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/55\\">](url-to-pr)|
      |✅|7.1|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/66\\">](url-to-pr)|

      Note: Successful backport PRs will be merged automatically after passing CI.

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
    `);
  });

  it('when all backports fail', () => {
    expect(
      getCommentBody({
        options: {
          repoName: 'kibana',
          repoOwner: 'elastic',
          autoMerge: true,
          backportBinary: 'node scripts/backport',
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
      |:------:|:------:|:------|
      |❌|7.x|My boom error!|
      |❌|7.1|My boom error!|

      ## How to fix

      Re-run the backport manually:
      \`\`\`
      node scripts/backport --pr 55
      \`\`\`

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
    `);
  });

  it('when some backports fail', () => {
    expect(
      getCommentBody({
        options: {
          repoName: 'kibana',
          repoOwner: 'elastic',
          autoMerge: true,
          backportBinary: 'node scripts/backport',
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
      |:------:|:------:|:------|
      |✅|7.x|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/55\\">](url-to-pr-55)|
      |❌|7.1|My boom error!|

      ## How to fix

      Re-run the backport manually:
      \`\`\`
      node scripts/backport --pr 55
      \`\`\`
      Note: Successful backport PRs will be merged automatically after passing CI.

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
    `);
  });

  it('when some backports fail due to conflicts', () => {
    expect(
      getCommentBody({
        options: {
          repoName: 'kibana',
          repoOwner: 'elastic',
          autoMerge: true,
          backportBinary: 'node scripts/backport',
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
                      originalMessage: 'New Zealand commit message',
                    },
                  },

                  {
                    //@ts-expect-error
                    commit: {
                      pullNumber: 44,
                      pullUrl: 'url-to-pr-44',
                      originalMessage: 'Australia commit',
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
                commitsWithoutBackports: [],
              }),
            },
          ],
        } as BackportResponse,
      })
    ).toMatchInlineSnapshot(`
      "## 💔 Some backports could not be created

      | Status | Branch | Result |
      |:------:|:------:|:------|
      |✅|7.x|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/55\\">](url-to-pr-55)|
      |❌|7.1|**Backport failed because of merge conflicts**<br><br>You might need to backport the following PRs to 7.1:<br> - [New Zealand commit message](url-to-pr-5)<br> - [Australia commit](url-to-pr-44)|
      |❌|7.2|**Backport failed because of merge conflicts**|

      ## How to fix

      Re-run the backport manually:
      \`\`\`
      node scripts/backport --pr 55
      \`\`\`
      Note: Successful backport PRs will be merged automatically after passing CI.

      ### Questions ?
      Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
    `);
  });
});
