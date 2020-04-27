import axios from 'axios';
import { BackportOptions } from '../../../options/options';
import { fetchPullRequestBySearchQuery } from './fetchPullRequestBySearchQuery';
import { fetchPullRequestBySearchQueryMock } from './mocks/fetchPullRequestBySearchQueryMock';

describe('fetchPullRequestBySearchQuery', () => {
  it('s', async () => {
    const spy = jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: fetchPullRequestBySearchQueryMock,
    });

    const res = await fetchPullRequestBySearchQuery({
      accessToken: 'myAccessToken',
      all: false,
      author: 'sqren',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      maxNumber: 10,
      repoName: 'kibana',
      repoOwner: 'elastic',
      sourceBranch: 'master',
      sourcePRsFilter: 'label:Team:apm',
    } as BackportOptions);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(res).toMatchInlineSnapshot(`
      Array [
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Fix timeout in APM setup (#58727)",
          "pullNumber": 58727,
          "selectedTargetBranches": Array [],
          "sha": "d474ccf244d22b8abf7df1be3e96b36b715281f1",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Improve debug output (#58467)",
          "pullNumber": 58467,
          "selectedTargetBranches": Array [],
          "sha": "0e0f114d03f0becb9bbc5b93cbed217f2663efbd",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Fix missing apm indicies (#53541)",
          "pullNumber": 53541,
          "selectedTargetBranches": Array [],
          "sha": "8b0d5f54dd701f0f5a9b36d2a8a1a27cffbdb6e3",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Quick fix for ACM to ensure more than 10 items are displayed (#52262)",
          "pullNumber": 52262,
          "selectedTargetBranches": Array [],
          "sha": "47dcf87e791c14c853172972232eaabebd8f609d",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Add log statements for flaky test (#53775)",
          "pullNumber": 53775,
          "selectedTargetBranches": Array [],
          "sha": "53513f6b7b85f1140352a99f65ff53f5cdb1ec79",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Fix failing ACM integration test (#52149)",
          "pullNumber": 52149,
          "selectedTargetBranches": Array [],
          "sha": "085a2af8ec3771c80ea2aeb8e592fd7c4c18c259",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Add support for basepath (#52162)",
          "pullNumber": 52162,
          "selectedTargetBranches": Array [],
          "sha": "b9e2895f2258da4b01f96ac2000514ef01f47379",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Improve index pattern handling (#50127)",
          "pullNumber": 50127,
          "selectedTargetBranches": Array [],
          "sha": "551b03b215e8c399d7ae6cac404d9d49f17c45d4",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Remove \`type\` from agent configuration (#48404)",
          "pullNumber": 48404,
          "selectedTargetBranches": Array [],
          "sha": "77247773b9cdcfc2257713f1df2a49e1c31d7066",
          "sourceBranch": "master",
        },
        Object {
          "existingTargetPullRequests": Array [],
          "formattedMessage": "[APM] Show loading state on waterfall and avoid re-fetching distribution chart when changing bucket (#44093)",
          "pullNumber": 44093,
          "selectedTargetBranches": Array [],
          "sha": "4657f0b041bd4a05102c18889121db252f23bf07",
          "sourceBranch": "master",
        },
      ]
    `);
  });
});
