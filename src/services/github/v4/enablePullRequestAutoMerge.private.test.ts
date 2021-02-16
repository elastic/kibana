import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { disablePullRequestAutoMerge } from './disablePullRequestAutoMerge';
import { enablePullRequestAutoMerge } from './enablePullRequestAutoMerge';
import { fetchPullRequestAutoMergeMethod } from './fetchPullRequestAutoMergeMethod';

// The test repo requires auto-merge being enabled in options, as well as all merge types enabled (merge, squash, rebase)
// The test pull request should be open, and not currently able to be merged (e.g. because it requires an approval),
// otherwise it will be merged when auto-merge is turned on
const TEST_REPO_OWNER = 'backport-org';
const TEST_REPO_NAME = 'repo-with-auto-merge-enabled';
const TEST_PULL_NUMBER = 1;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let options: ValidConfigOptions;

describe('enablePullRequestAutoMerge', () => {
  beforeEach(async () => {
    options = {
      accessToken: await getDevAccessToken(),
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      repoOwner: TEST_REPO_OWNER,
      repoName: TEST_REPO_NAME,
    } as ValidConfigOptions;

    await disablePullRequestAutoMerge(options, TEST_PULL_NUMBER);
  });

  // cleanup
  afterAll(async () => {
    await disablePullRequestAutoMerge(options, TEST_PULL_NUMBER);
  });

  it('should enable auto-merge via merge', async () => {
    await enablePullRequestAutoMerge(
      { ...options, autoMergeMethod: 'merge' },
      TEST_PULL_NUMBER
    );

    // ensure Github API reflects the change before querying
    await sleep(100);

    const autoMergeMethod = await fetchPullRequestAutoMergeMethod(
      options,
      TEST_PULL_NUMBER
    );
    expect(autoMergeMethod).toBe('MERGE');
  });

  it('should enable auto-merge via rebase', async () => {
    await enablePullRequestAutoMerge(
      { ...options, autoMergeMethod: 'rebase' },
      TEST_PULL_NUMBER
    );

    // ensure Github API reflects the change before querying
    await sleep(100);

    const autoMergeMethod = await fetchPullRequestAutoMergeMethod(
      options,
      TEST_PULL_NUMBER
    );
    expect(autoMergeMethod).toBe('REBASE');
  });

  it('should enable auto-merge via squash', async () => {
    await enablePullRequestAutoMerge(
      { ...options, autoMergeMethod: 'squash' },
      TEST_PULL_NUMBER
    );

    // ensure Github API reflects the change before querying
    await sleep(100);

    const autoMergeMethod = await fetchPullRequestAutoMergeMethod(
      options,
      TEST_PULL_NUMBER
    );
    expect(autoMergeMethod).toBe('SQUASH');
  });
});
