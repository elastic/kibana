import nock from 'nock';
import { ValidConfigOptions } from '../../../options/options';
import { mockGqlRequest } from '../../../test/nockHelpers';
import { PromiseReturnType } from '../../../types/PromiseReturnType';
import { fetchPullRequestBySearchQuery } from './fetchPullRequestBySearchQuery';
import { fetchPullRequestBySearchQueryMock } from './mocks/fetchPullRequestBySearchQueryMock';

describe('fetchPullRequestBySearchQuery', () => {
  let res: PromiseReturnType<typeof fetchPullRequestBySearchQuery>;
  let mockCalls: ReturnType<typeof mockGqlRequest>;

  beforeEach(async () => {
    mockCalls = mockGqlRequest({
      name: 'PullRequestBySearchQuery',
      statusCode: 200,
      body: { data: fetchPullRequestBySearchQueryMock },
    });

    res = await fetchPullRequestBySearchQuery({
      accessToken: 'myAccessToken',
      all: false,
      author: 'sqren',
      githubApiBaseUrlV4: 'http://localhost/graphql',
      maxNumber: 10,
      repoName: 'kibana',
      repoOwner: 'elastic',
      sourceBranch: 'master',
      prFilter: 'label:Team:apm',
    } as ValidConfigOptions);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should make request with correct variables', () => {
    expect(mockCalls.length).toBe(1);
    expect(mockCalls[0].variables).toEqual({
      maxNumber: 10,
      query:
        'type:pr is:merged sort:updated-desc repo:elastic/kibana author:sqren label:Team:apm base:master',
    });
  });

  it('should return correct response', async () => {
    expect(res).toMatchInlineSnapshot(`
      Array [
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "[APM] @ts-error -> @ts-expect-error (#76492)",
          "originalMessage": "[APM] @ts-error -> @ts-expect-error (#76492)

      Co-authored-by: Elastic Machine <elasticmachine@users.noreply.github.com>",
          "pullNumber": 76492,
          "sha": "e0f4775b780aada005bdd1774edcceac0ffee006",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "[APM] Avoid negative offset for error marker on timeline (#76638)",
          "originalMessage": "[APM] Avoid negative offset for error marker on timeline (#76638)

      Co-authored-by: Elastic Machine <elasticmachine@users.noreply.github.com>",
          "pullNumber": 76638,
          "sha": "fae1e02e0f7a475bf92da05be52a817aa2a84959",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
            Object {
              "branch": "7.9",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "[APM] Add anomaly detection API tests + fixes (#73120)",
          "originalMessage": "[APM] Add anomaly detection API tests + fixes (#73120)

      Co-authored-by: Nathan L Smith <nathan.smith@elastic.co>",
          "pullNumber": 73120,
          "sha": "aa68e3b63a4b513294dc58eaf4422e66a0beffb1",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Update script with new roles/users (#72599)",
          "originalMessage": "[APM] Update script with new roles/users (#72599)

      * [APM] Update script with new roles/users

      * add log

      * Add validation for http prefix",
          "pullNumber": 72599,
          "sha": "2fc7112ec27a9f8ded0e2f9e097613721f1179dd",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
            Object {
              "branch": "7.9",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "Update jobs_list.tsx (#72797)",
          "originalMessage": "Update jobs_list.tsx (#72797)",
          "pullNumber": 72797,
          "sha": "7e126bfab6a3bfc44f9fa50feecfe22b4634e1a0",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "[APM] Fix confusing request/minute viz (#69143)",
          "originalMessage": "[APM] Fix confusing request/minute viz (#69143)",
          "pullNumber": 69143,
          "sha": "d12208c7ea9513529ea1aff42d154db89e3573ff",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "[APM] Remove watcher integration (#71655)",
          "originalMessage": "[APM] Remove watcher integration (#71655)",
          "pullNumber": 71655,
          "sha": "f760d8513b0216a73e9a476661f0fb8fb0887a61",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
            Object {
              "branch": "7.9",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "[APM] Disable flaky rum e2e’s (#72614)",
          "originalMessage": "[APM] Disable flaky rum e2e’s (#72614)",
          "pullNumber": 72614,
          "sha": "05ee3da80db34ccf93e7424aa2704c098a1b49fa",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
            Object {
              "branch": "7.9",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "[APM] Increase \`xpack.apm.ui.transactionGroupBucketSize\` (#71661)",
          "originalMessage": "[APM] Increase \`xpack.apm.ui.transactionGroupBucketSize\` (#71661)",
          "pullNumber": 71661,
          "sha": "51a862988c344b34bd9da57dd57008df12e1b5e5",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [
            Object {
              "branch": "7.9",
              "number": 99,
              "state": "MERGED",
            },
            Object {
              "branch": "7.x",
              "number": 99,
              "state": "MERGED",
            },
          ],
          "formattedMessage": "[APM] Handle ML errors (#72316)",
          "originalMessage": "[APM] Handle ML errors (#72316)

      * [APM] Handle ML errors

      * Add capability check

      * Improve test

      * Address Caue’s feedback

      * Move getSeverity

      * Fix tsc

      * Fix copy",
          "pullNumber": 72316,
          "sha": "511e4543a7828cf0cdb157b88b01352947e0384f",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
      ]
    `);
  });
});
