import nock from 'nock';
import { BackportOptions } from '../../../options/options';
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
      body: fetchPullRequestBySearchQueryMock,
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
    } as BackportOptions);
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
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Fix timeout in APM setup (#58727)",
          "originalMessage": "[APM] Fix timeout in APM setup (#58727)

      * [APM] Fix timeout in APM setup

      * Update plugin.ts",
          "pullNumber": 58727,
          "sha": "d474ccf244d22b8abf7df1be3e96b36b715281f1",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Improve debug output (#58467)",
          "originalMessage": "[APM] Improve debug output (#58467)",
          "pullNumber": 58467,
          "sha": "0e0f114d03f0becb9bbc5b93cbed217f2663efbd",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Fix missing apm indicies (#53541)",
          "originalMessage": "[APM] Fix missing apm indicies (#53541)

      * [APM] Fix missing apm indicies

      * Fix infinite loop in ui indices

      * Add test for empty settings",
          "pullNumber": 53541,
          "sha": "8b0d5f54dd701f0f5a9b36d2a8a1a27cffbdb6e3",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Quick fix for ACM to ensure more than 10 items are displayed (#52262)",
          "originalMessage": "[APM] Quick fix for ACM to ensure more than 10 items are displayed (#52262)

      * [APM] Quick fix for ACM to ensure more than 10 items are displayed

      * Fix snapshot",
          "pullNumber": 52262,
          "sha": "47dcf87e791c14c853172972232eaabebd8f609d",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Add log statements for flaky test (#53775)",
          "originalMessage": "[APM] Add log statements for flaky test (#53775)

      * [APM] Add log statements for flaky test

      * Improve logging

      * Improve logging

      * Log full index on error",
          "pullNumber": 53775,
          "sha": "53513f6b7b85f1140352a99f65ff53f5cdb1ec79",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Fix failing ACM integration test (#52149)",
          "originalMessage": "[APM] Fix failing ACM integration test (#52149)",
          "pullNumber": 52149,
          "sha": "085a2af8ec3771c80ea2aeb8e592fd7c4c18c259",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Add support for basepath (#52162)",
          "originalMessage": "[APM] Add support for basepath (#52162)",
          "pullNumber": 52162,
          "sha": "b9e2895f2258da4b01f96ac2000514ef01f47379",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Improve index pattern handling (#50127)",
          "originalMessage": "[APM] Improve index pattern handling (#50127)

      * [APM] Improve index pattern handling

      Handle exceptions

      Extract index pattern id as constant

      Catch error when dynamic index pattern cannot be fetched

      Use req instead of request

      * [APM] Address feedback

      * Check for data before creating index pattern

      * Add test

      * Created ProcessorEvent as enum

      * Revert ProcessorEvent back to type",
          "pullNumber": 50127,
          "sha": "551b03b215e8c399d7ae6cac404d9d49f17c45d4",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Remove \`type\` from agent configuration (#48404)",
          "originalMessage": "[APM] Remove \`type\` from agent configuration (#48404)",
          "pullNumber": 48404,
          "sha": "77247773b9cdcfc2257713f1df2a49e1c31d7066",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Show loading state on waterfall and avoid re-fetching distribution chart when changing bucket (#44093)",
          "originalMessage": "[APM] Show loading state on waterfall and avoid re-fetching distribution chart when changing bucket (#44093)",
          "pullNumber": 44093,
          "sha": "4657f0b041bd4a05102c18889121db252f23bf07",
          "sourceBranch": "master",
          "targetBranchesFromLabels": Array [],
        },
      ]
    `);
  });
});
