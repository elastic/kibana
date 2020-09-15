import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchMergedPullRequests } from './fetchMergedPullRequests';

describe('fetchMergedPullRequests', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('fetchMergedPullRequests', () => {
    it('returns the unbackported PRs', async () => {
      const options = {
        repoOwner: 'backport-org',
        repoName: 'backport-e2e',
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        branchLabelMapping: {
          '^v8.0.0$': 'master',
          '^v7.9.0$': '7.x',
          '^v(\\d+).(\\d+).\\d+$': '$1.$2',
        } as ValidConfigOptions['branchLabelMapping'],
      } as ValidConfigOptions;

      const dateRange = {
        since: new Date('2020-01-01').toISOString(),
        until: new Date('2020-09-01').toISOString(),
      };

      const res = await fetchMergedPullRequests(options, dateRange);

      expect(res).toMatchInlineSnapshot(`
        Array [
          Object {
            "existingTargetPullRequests": Array [
              Object {
                "branch": "7.8",
                "number": 10,
                "state": "OPEN",
              },
            ],
            "expectedTargetBranches": Array [
              "7.8",
            ],
            "remainingTargetBranches": Array [
              "7.8",
            ],
            "sourcePullNumber": 9,
          },
          Object {
            "existingTargetPullRequests": Array [],
            "expectedTargetBranches": Array [
              "7.x",
            ],
            "remainingTargetBranches": Array [
              "7.x",
            ],
            "sourcePullNumber": 8,
          },
        ]
      `);
    });
  });
});
