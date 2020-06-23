import axios from 'axios';
import { getOptions } from './options';

function setupSpy({
  defaultBranch,
  refName,
}: {
  defaultBranch: string;
  refName?: 'backport';
}) {
  // startup check request
  return jest.spyOn(axios, 'post').mockResolvedValueOnce({
    data: {
      data: {
        repository: {
          ref: {
            name: refName,
          },
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
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use the default repository branch as sourceBranch', async () => {
    const spy = setupSpy({ defaultBranch: 'my-default-branch' });
    const options = await getOptions(defaultArgs);
    expect(spy).toHaveBeenCalledTimes(1);
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
    ];

    setupSpy({ defaultBranch: 'my-default-branch' });
    const options = await getOptions(argv);
    expect(options.sourceBranch).toBe('my-source-branch');
  });

  it('should ensure that "backport" branch does not exist', async () => {
    setupSpy({
      defaultBranch: 'my-default-branch',
      refName: 'backport',
    });

    await expect(getOptions(defaultArgs)).rejects.toThrowError(
      'You must delete the branch "backport" to continue. See https://github.com/sqren/backport/issues/155 for details'
    );
  });

  it('should omit upstream', async () => {
    setupSpy({ defaultBranch: 'my-default-branch' });
    const options = await getOptions(defaultArgs);
    //@ts-expect-error
    expect(options.upstream).toBe(undefined);
  });

  it('should merge config options and module options', async () => {
    setupSpy({ defaultBranch: 'my-default-branch' });
    const myFn = async () => true;
    const options = await getOptions(defaultArgs, { autoFixConflicts: myFn });
    expect(options.autoFixConflicts).toBe(myFn);
  });

  it('should return options', async () => {
    setupSpy({ defaultBranch: 'some-branch-name' });
    const options = await getOptions(defaultArgs);

    expect(options).toEqual({
      accessToken: 'myAccessToken',
      all: false,
      author: 'sqren',
      assignees: [],
      dryRun: false,
      fork: true,
      gitHostname: 'github.com',
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
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
