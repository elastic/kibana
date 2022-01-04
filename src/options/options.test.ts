import nock from 'nock';
import { GithubConfigOptionsResponse } from '../services/github/v4/getOptionsFromGithub/query';
import * as logger from '../services/logger';
import { mockConfigFiles } from '../test/mockConfigFiles';
import { mockGqlRequest } from '../test/nockHelpers';
import { getOptions } from './options';

jest.unmock('../services/fs-promisified');

function mockGithubConfigOptions({
  viewerLogin = 'sqren',
  defaultBranchRef = 'DO_NOT_USE-default-branch-name',
  refName,
  historicalMappings = [],
}: {
  viewerLogin?: string;
  defaultBranchRef?: string;
  refName?: string;
  historicalMappings?: Array<{
    committedDate: string;
    branchLabelMapping: Record<string, string>;
  }>;
}) {
  return mockGqlRequest<GithubConfigOptionsResponse>({
    name: 'GithubConfigOptions',
    statusCode: 200,
    body: {
      data: {
        viewer: {
          login: viewerLogin,
        },
        repository: {
          isFork: false,
          parent: null,
          ref: refName ? { name: refName } : null,
          defaultBranchRef: {
            name: defaultBranchRef,
            target: {
              history: {
                edges: historicalMappings.map(
                  ({ committedDate, branchLabelMapping }) => {
                    return {
                      remoteConfig: {
                        committedDate,
                        file: {
                          object: {
                            text: JSON.stringify({
                              branchLabelMapping,
                            }),
                          },
                        },
                      },
                    };
                  }
                ),
              },
            },
          },
        },
      },
    },
  });
}

const defaultConfigs = {
  projectConfig: {
    // use localhost to avoid CORS issues with nock
    githubApiBaseUrlV4: 'http://localhost/graphql',
    repoOwner: 'elastic',
    repoName: 'kibana',
    targetBranchChoices: ['7.9', '8.0'],
  },
  globalConfig: { accessToken: 'abc', editor: 'code' },
};

describe('getOptions', () => {
  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  beforeEach(() => {
    mockConfigFiles(defaultConfigs);
  });

  describe('should throw', () => {
    beforeEach(() => {
      mockGithubConfigOptions({});
    });

    it('when accessToken is missing', async () => {
      mockConfigFiles({
        projectConfig: defaultConfigs.projectConfig,
        globalConfig: { accessToken: undefined },
      });
      await expect(() => getOptions([])).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Please update your config file: /Users/sqren/.backport/config.json.
              It must contain a valid \\"accessToken\\".

              Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#global-config-backportconfigjson"
            `);
    });

    it('when `targetBranches`, `targetBranchChoices` and `branchLabelMapping` are all empty', async () => {
      mockConfigFiles({
        projectConfig: {
          ...defaultConfigs.projectConfig,
          targetBranchChoices: undefined,
          branchLabelMapping: undefined,
        },
        globalConfig: { accessToken: 'abc' },
      });

      await expect(() => getOptions([])).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Please specify a target branch: \\"--branch 6.1\\". 

               Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#project-config-backportrcjson"
            `);
    });

    it('when repoName is missing', async () => {
      mockConfigFiles({
        projectConfig: {
          ...defaultConfigs.projectConfig,
          repoName: '',
        },
        globalConfig: { accessToken: 'abc' },
      });

      await expect(() => getOptions([])).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Please specify a repo name: \\"--repo-name kibana\\". 

              Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#project-config-backportrcjson"
            `);
    });

    it('when repoOwner is missing', async () => {
      mockConfigFiles({
        projectConfig: {
          ...defaultConfigs.projectConfig,
          repoOwner: '',
        },
        globalConfig: { accessToken: 'abc' },
      });

      await expect(() => getOptions([])).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Please specify a repo owner: \\"--repo-owner elastic\\". 

              Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#project-config-backportrcjson"
            `);
    });
  });

  describe('sourceBranch', () => {
    beforeEach(() => {
      mockGithubConfigOptions({ defaultBranchRef: 'some-default-branch' });
    });

    it('uses the `defaultBranchRef` as default', async () => {
      const options = await getOptions([]);
      expect(options.sourceBranch).toBe('some-default-branch');
    });

    it('uses the sourceBranch given via cli instead of `defaultBranchRef`', async () => {
      const options = await getOptions([
        '--source-branch',
        'cli-source-branch',
      ]);
      expect(options.sourceBranch).toBe('cli-source-branch');
    });
  });

  it('should ensure that "backport" branch does not exist', async () => {
    mockGithubConfigOptions({
      refName: 'backport',
    });

    await expect(getOptions([])).rejects.toThrowError(
      'You must delete the branch "backport" to continue. See https://github.com/sqren/backport/issues/155 for details'
    );
  });

  it('should merge config options and module options', async () => {
    mockGithubConfigOptions({});
    const myFn = async () => true;

    const options = await getOptions([], { autoFixConflicts: myFn });
    expect(options.autoFixConflicts).toBe(myFn);
  });

  it('should call updateLogger', async () => {
    mockGithubConfigOptions({});
    await getOptions([]);

    expect(logger.updateLogger).toHaveBeenCalledTimes(1);
  });

  it('should return options', async () => {
    mockGithubConfigOptions({
      defaultBranchRef: 'default-branch-from-github',
      historicalMappings: [
        {
          committedDate: '2022-01-02T20:52:45.173Z',
          branchLabelMapping: { foo: 'bar' },
        },
      ],
    });
    const options = await getOptions([]);

    expect(options).toEqual({
      accessToken: 'abc',
      assignees: [],
      autoAssign: false,
      autoMerge: false,
      autoMergeMethod: 'merge',
      authenticatedUsername: 'sqren',
      branchLabelMapping: {
        foo: 'bar',
      },
      cherrypickRef: true,
      ci: false,
      commitPaths: [],
      details: false,
      editor: 'code',
      fork: true,
      githubApiBaseUrlV4: 'http://localhost/graphql',
      historicalBranchLabelMappings: [
        {
          branchLabelMapping: { foo: 'bar' },
          committedDate: '2022-01-02T20:52:45.173Z',
        },
      ],
      mainline: 1,
      maxNumber: 10,
      multipleBranches: true,
      multipleCommits: false,
      noVerify: true,
      repoName: 'kibana',
      repoOwner: 'elastic',
      resetAuthor: false,
      reviewers: [],
      sourceBranch: 'default-branch-from-github',
      sourcePRLabels: [],
      targetBranchChoices: ['7.9', '8.0'],
      targetBranches: [],
      targetPRLabels: [],
      author: 'sqren',
      verbose: false,
    });
  });

  describe('author', () => {
    beforeEach(() => {
      mockGithubConfigOptions({ viewerLogin: 'billy.bob' });
    });

    it('defaults to authenticated user', async () => {
      const { author } = await getOptions([]);
      expect(author).toBe('billy.bob');
    });

    it('can be overridden via cli args', async () => {
      const { author } = await getOptions(['--author', 'john.doe']);
      expect(author).toBe('john.doe');
    });

    it('can be overridden via config file', async () => {
      mockConfigFiles({
        globalConfig: { accessToken: 'abc' },
        projectConfig: {
          author: 'jane.doe',
          githubApiBaseUrlV4: 'http://localhost/graphql',
          targetBranchChoices: ['7.9', '8.0'],
          repoName: 'foo',
          repoOwner: 'bar',
        },
      });

      const { author } = await getOptions([]);
      expect(author).toBe('jane.doe');
    });
  });

  describe('cherrypickRef', () => {
    beforeEach(() => {
      mockGithubConfigOptions({});
    });

    it('should default to true', async () => {
      const { cherrypickRef } = await getOptions([]);
      expect(cherrypickRef).toBe(true);
    });

    it('should negate with `noCherrypickRef` cli arg', async () => {
      const { cherrypickRef } = await getOptions(['--no-cherrypick-ref']);
      expect(cherrypickRef).toBe(false);
    });

    it('should be settable via config file', async () => {
      const { cherrypickRef } = await getOptions([], {
        cherrypickRef: false,
      });

      expect(cherrypickRef).toBe(false);
    });

    it('cli args overwrites config', async () => {
      const { cherrypickRef } = await getOptions(['--cherrypick-ref'], {
        cherrypickRef: false,
      });

      expect(cherrypickRef).toBe(true);
    });
  });
});
