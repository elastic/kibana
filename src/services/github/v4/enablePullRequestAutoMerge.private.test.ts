import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { disablePullRequestAutoMerge } from './disablePullRequestAutoMerge';
import { enablePullRequestAutoMerge } from './enablePullRequestAutoMerge';

// The test repo requires auto-merge being enabled in options, as well as all merge types enabled (merge, squash, rebase)
// The test pull request should be open, and not currently able to be merged (e.g. because it requires an approval),
// otherwise it will be merged when auto-merge is turned on
const TEST_REPO_OWNER = '';
const TEST_REPO_NAME = '';
const TEST_PULL_NUMBER = 0;

let options: ValidConfigOptions & { pullNumber: number };

const setOptions = (
  devAccessToken: string,
  overrides: Partial<ValidConfigOptions> = {}
) => {
  options = {
    accessToken: devAccessToken,
    githubApiBaseUrlV4: 'https://api.github.com/graphql',
    repoOwner: TEST_REPO_OWNER,
    repoName: TEST_REPO_NAME,
    pullNumber: TEST_PULL_NUMBER,
    ...overrides,
  } as ValidConfigOptions & { pullNumber: number };
};

describe('enablePullRequestAutoMerge', () => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!TEST_REPO_OWNER || !TEST_REPO_NAME || !TEST_PULL_NUMBER) {
    return;
  }

  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
    setOptions(devAccessToken);

    // Turn auto-merge off if it's on before the tests start
    await disablePullRequestAutoMerge(options);
  });

  beforeEach(async () => {
    setOptions(devAccessToken);
  });

  afterEach(async () => {
    await disablePullRequestAutoMerge(options);
  });

  it('should enable auto-merge via merge', async () => {
    setOptions(devAccessToken, { autoMergeMethod: 'merge' });
    expect(await enablePullRequestAutoMerge(options)).toEqual(TEST_PULL_NUMBER);
  });

  it('should enable auto-merge via rebase', async () => {
    setOptions(devAccessToken, { autoMergeMethod: 'rebase' });
    expect(await enablePullRequestAutoMerge(options)).toEqual(TEST_PULL_NUMBER);
  });

  it('should enable auto-merge via squash', async () => {
    setOptions(devAccessToken, { autoMergeMethod: 'squash' });
    expect(await enablePullRequestAutoMerge(options)).toEqual(TEST_PULL_NUMBER);
  });
});
