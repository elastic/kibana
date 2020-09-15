import nock from 'nock';
import * as logger from '../services/logger';
import { mockGqlRequest } from '../test/nockHelpers';
import { getOptions } from './options';

function mockGetDefaultRepoBranch({
  defaultBranch,
  refName,
}: {
  defaultBranch: string;
  refName?: 'backport';
}) {
  return mockGqlRequest({
    name: 'DefaultRepoBranch',
    statusCode: 200,
    body: {
      data: {
        repository: {
          ref: { name: refName },
          defaultBranchRef: { name: defaultBranch },
        },
      },
    },
  });
}

describe('getOptions', () => {
  const defaultArgs = [
    '--branch',
    '6.0',
    '--branch',
    '6.1',
    '--upstream',
    'elastic/kibana',

    // use localhost to avoid CORS issues with nock
    '--github-api-base-url-v4',
    'http://localhost/graphql',
  ];

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  it('should use the default repository branch as sourceBranch', async () => {
    const mockCalls = mockGetDefaultRepoBranch({
      defaultBranch: 'my-default-branch',
    });
    const options = await getOptions(defaultArgs);
    expect(mockCalls.length).toBe(1);
    expect(options.sourceBranch).toBe('my-default-branch');
  });

  it('should use explicit sourceBranch instead of defaultBranch', async () => {
    const argv = [
      '--branch',
      '6.0',
      '--branch',
      '6.1',
      '--upstream',
      'elastic/kibana',
      '--source-branch',
      'my-source-branch',
      '--github-api-base-url-v4',
      'http://localhost/graphql',
    ];

    mockGetDefaultRepoBranch({ defaultBranch: 'my-default-branch' });
    const options = await getOptions(argv);
    expect(options.sourceBranch).toBe('my-source-branch');
  });

  it('should ensure that "backport" branch does not exist', async () => {
    mockGetDefaultRepoBranch({
      defaultBranch: 'my-default-branch',
      refName: 'backport',
    });

    await expect(getOptions(defaultArgs)).rejects.toThrowError(
      'You must delete the branch "backport" to continue. See https://github.com/sqren/backport/issues/155 for details'
    );
  });

  it('should omit upstream', async () => {
    mockGetDefaultRepoBranch({ defaultBranch: 'my-default-branch' });
    const options = await getOptions(defaultArgs);
    //@ts-expect-error
    expect(options.upstream).toBe(undefined);
  });

  it('should merge config options and module options', async () => {
    mockGetDefaultRepoBranch({ defaultBranch: 'my-default-branch' });
    const myFn = async () => true;
    const options = await getOptions(defaultArgs, { autoFixConflicts: myFn });
    expect(options.autoFixConflicts).toBe(myFn);
  });

  it('should call updateLogger', async () => {
    mockGetDefaultRepoBranch({ defaultBranch: 'my-default-branch' });
    await getOptions(defaultArgs);
    expect(logger.updateLogger).toHaveBeenCalledTimes(1);
  });

  it('should return options', async () => {
    mockGetDefaultRepoBranch({ defaultBranch: 'some-branch-name' });
    const options = await getOptions(defaultArgs);

    expect(options).toEqual({
      accessToken: 'myAccessToken',
      all: false,
      author: 'sqren',
      assignees: [],
      ci: false,
      dryRun: false,
      fork: true,
      gitHostname: 'github.com',
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'http://localhost/graphql',
      maxNumber: 10,
      multipleBranches: true,
      multipleCommits: false,
      noVerify: true,
      prTitle: '[{targetBranch}] {commitMessages}',
      repoName: 'kibana',
      repoOwner: 'elastic',
      resetAuthor: false,
      sourceBranch: 'some-branch-name',
      sourcePRLabels: [],
      targetBranchChoices: [
        { checked: false, name: '6.0' },
        { checked: false, name: '5.9' },
      ],
      targetBranches: ['6.0', '6.1'],
      targetPRLabels: [],
      username: 'sqren',
      verbose: false,
    });
  });
});
