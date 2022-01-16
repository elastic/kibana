import nock from 'nock';
import { BackportResponse } from '../../../backportRun';
import { ValidConfigOptions } from '../../../options/options';
import { HandledError } from '../../HandledError';
import { createStatusComment, getCommentBody } from './createStatusComment';

describe('createStatusComment', () => {
  it('redacts accessToken if it is included in the error message', async () => {
    const accessToken = 'ghp_abcdefg';

    const scope = nock('https://api.github.com')
      .post('/repos/elastic/kibana/issues/100/comments')
      .reply(200, 'some response');

    let postedCommentBody = '';
    scope.on('request', (req, interceptor, body) => {
      postedCommentBody = JSON.parse(body).body;
    });

    await createStatusComment({
      options: {
        repoName: 'kibana',
        repoOwner: 'elastic',
        accessToken,
        backportBinary: 'node scripts/backport',
        publishStatusComment: true,
        githubApiBaseUrlV3: 'https://api.github.com',
        ci: true,
      } as ValidConfigOptions,
      backportResponse: {
        commits: [{ pullNumber: 100 }],
        status: 'failure',
        errorMessage: `Error message containing very secret access token: ${accessToken}.`,
      } as BackportResponse,
    });

    expect(postedCommentBody).toContain(
      'Error message containing very secret access token: <REDACTED>'
    );

    scope.done();
    nock.cleanAll();
  });
});

describe('getCommentBody', () => {
  describe('when an unknown error occurs', () => {
    const getParams = (opts: Partial<ValidConfigOptions>) => ({
      options: {
        backportBinary: 'node scripts/backport',
        ...opts,
      } as ValidConfigOptions,
      pullNumber: 55,
      backportResponse: {
        status: 'failure',
        errorMessage: 'A terrible error occured',
      } as BackportResponse,
    });

    it('posts a comment when running on ci', () => {
      const params = getParams({ ci: true });
      expect(getCommentBody(params)).toMatchInlineSnapshot(`
            "## 💔 Backport failed
            The pull request could not be backported due to the following error:
            \`A terrible error occured\`

            ### How to fix
            Re-run the backport manually:
            \`\`\`
            node scripts/backport --pr 55
            \`\`\`

            ### Questions ?
            Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
        `);
    });

    it('does not post a comment when running manually', () => {
      const params = getParams({ ci: false });
      expect(getCommentBody(params)).toBe(undefined);
    });
  });

  describe('when all backports succeed', () => {
    const getParams = (opts: Partial<ValidConfigOptions>) => ({
      options: {
        repoName: 'kibana',
        repoOwner: 'elastic',
        autoMerge: true,
        ...opts,
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
    });

    it('posts a comment on ci', () => {
      const params = getParams({ ci: true });
      expect(getCommentBody(params)).toMatchInlineSnapshot(`
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

    it('posts a comment when running locally', () => {
      const params = getParams({ ci: false });
      expect(getCommentBody(params)).toMatchInlineSnapshot(`
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
  });

  describe('when all backports fail', () => {
    const getParams = (opts: Partial<ValidConfigOptions>) => ({
      options: {
        repoName: 'kibana',
        repoOwner: 'elastic',
        autoMerge: true,
        backportBinary: 'node scripts/backport',
        ...opts,
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
    });

    it('posts a comment on CI', () => {
      const params = getParams({ ci: true });
      expect(getCommentBody(params)).toMatchInlineSnapshot(`
        "## 💔 All backports failed

        | Status | Branch | Result |
        |:------:|:------:|:------|
        |❌|7.x|My boom error!|
        |❌|7.1|My boom error!|

        ### How to fix
        Re-run the backport manually:
        \`\`\`
        node scripts/backport --pr 55
        \`\`\`

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
      `);
    });

    it('does not post a comment when running manaully', () => {
      const params = getParams({ ci: false });
      expect(getCommentBody(params)).toBe(undefined);
    });
  });

  describe('when some backports fail', () => {
    const getParams = (opts: Partial<ValidConfigOptions>) => ({
      options: {
        repoName: 'kibana',
        repoOwner: 'elastic',
        autoMerge: true,
        backportBinary: 'node scripts/backport',
        ...opts,
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
    });

    it('post a comment when running on CI', () => {
      const params = getParams({ ci: true });
      expect(getCommentBody(params)).toMatchInlineSnapshot(`
            "## 💔 Some backports could not be created

            | Status | Branch | Result |
            |:------:|:------:|:------|
            |✅|7.x|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/55\\">](url-to-pr-55)|
            |❌|7.1|My boom error!|

            ### How to fix
            Re-run the backport manually:
            \`\`\`
            node scripts/backport --pr 55
            \`\`\`
            Note: Successful backport PRs will be merged automatically after passing CI.

            ### Questions ?
            Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
        `);
    });

    it('does not post a comment when running manually because some backports failed', () => {
      const params = getParams({ ci: false });
      expect(getCommentBody(params)).toMatchInlineSnapshot(`undefined`);
    });
  });

  describe('when some backports fail due to conflicts', () => {
    const getParams = (opts: Partial<ValidConfigOptions>) => ({
      options: {
        repoName: 'kibana',
        repoOwner: 'elastic',
        autoMerge: true,
        backportBinary: 'node scripts/backport',
        ...opts,
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
              type: 'merge-conflict-due-to-missing-backports',
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
              type: 'merge-conflict-due-to-missing-backports',
              commitsWithoutBackports: [],
            }),
          },
        ],
      } as BackportResponse,
    });

    it('posts a comment when running on CI', () => {
      const params = getParams({ ci: true });
      expect(getCommentBody(params)).toMatchInlineSnapshot(`
        "## 💔 Some backports could not be created

        | Status | Branch | Result |
        |:------:|:------:|:------|
        |✅|7.x|[<img src=\\"https://img.shields.io/github/pulls/detail/state/elastic/kibana/55\\">](url-to-pr-55)|
        |❌|7.1|**Backport failed because of merge conflicts**<br><br>You might need to backport the following PRs to 7.1:<br> - [New Zealand commit message](url-to-pr-5)<br> - [Australia commit](url-to-pr-44)|
        |❌|7.2|**Backport failed because of merge conflicts**|

        ### How to fix
        Re-run the backport manually:
        \`\`\`
        node scripts/backport --pr 55
        \`\`\`
        Note: Successful backport PRs will be merged automatically after passing CI.

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
      `);
    });

    it('does not post a comment when running manually because some backports failed', () => {
      const params = getParams({ ci: false });
      expect(getCommentBody(params)).toMatchInlineSnapshot(`undefined`);
    });
  });
});
