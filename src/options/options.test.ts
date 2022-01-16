import os from 'os';
import nock from 'nock';
import * as fs from '../services/fs-promisified';
import { GithubConfigOptionsResponse } from '../services/github/v4/getOptionsFromGithub/query';
import * as logger from '../services/logger';
import { mockConfigFiles } from '../test/mockConfigFiles';
import { mockGqlRequest } from '../test/nockHelpers';
import { ConfigFileOptions } from './ConfigOptions';
import { getOptions } from './options';

jest.unmock('../services/fs-promisified');

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
    jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');
    jest.spyOn(fs, 'writeFile').mockResolvedValue();
    jest.spyOn(fs, 'chmod').mockResolvedValue();
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

      await expect(() => getOptions([], { ci: true })).rejects
        .toThrowErrorMatchingInlineSnapshot(`
      "Please update your config file: \\"/myHomeDir/.backport/config.json\\".
      It must contain a valid \\"accessToken\\".

      Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#global-config-backportconfigjson"
      `);
    });

    it('when `targetBranches`, `targetBranchChoices` and `branchLabelMapping` are all empty', async () => {
      mockProjectConfig({
        targetBranches: undefined,
        targetBranchChoices: undefined,
        branchLabelMapping: undefined,
      });

      await expect(() => getOptions([], {})).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Please specify a target branch: \\"--branch 6.1\\".

              Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#project-config-backportrcjson"
            `);
    });

    it('when repoName is missing', async () => {
      mockProjectConfig({ repoName: '' });

      await expect(() => getOptions([], {})).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Please specify a repo name: \\"--repo-name kibana\\".

              Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#project-config-backportrcjson"
            `);
    });

    it('when repoOwner is missing', async () => {
      mockProjectConfig({ repoOwner: '' });

      await expect(() => getOptions([], {})).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Please specify a repo owner: \\"--repo-owner elastic\\".

              Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#project-config-backportrcjson"
            `);
    });
  });

  it('should ensure that "backport" branch does not exist', async () => {
    mockGithubConfigOptions({ refName: 'backport' });
    await expect(getOptions([], {})).rejects.toThrowError(
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
    await getOptions([], {});

    expect(logger.updateLogger).toHaveBeenCalledTimes(1);
  });

  it('should return options', async () => {
    mockGithubConfigOptions({
      viewerLogin: 'john.diller',
      defaultBranchRef: 'default-branch-from-github',
      historicalMappings: [
        {
          committedDate: '2022-01-02T20:52:45.173Z',
          branchLabelMapping: { foo: 'bar' },
        },
      ],
    });
    const options = await getOptions([], {});

    expect(options).toEqual({
      accessToken: 'abc',
      assignees: [],
      authenticatedUsername: 'john.diller',
      author: 'john.diller',
      autoAssign: false,
      autoMerge: false,
      autoMergeMethod: 'merge',
      backportBinary: 'backport',
      branchLabelMapping: {
        foo: 'bar',
      },
      cherrypickRef: true,
      ci: false,
      commitPaths: [],
      dateSince: null,
      dateUntil: null,
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
      maxNumber: 10,
      multipleBranches: true,
      multipleCommits: false,
      noVerify: true,
      publishStatusComment: true,
      repoName: 'kibana',
      repoOwner: 'elastic',
      resetAuthor: false,
      reviewers: [],
      sourceBranch: 'default-branch-from-github',
      sourcePRLabels: [],
      targetBranchChoices: ['7.9', '8.0'],
      targetBranches: [],
      targetPRLabels: [],
      verbose: false,
    });
  });

  describe('sourceBranch', () => {
    beforeEach(() => {
      mockGithubConfigOptions({ defaultBranchRef: 'some-default-branch' });
    });

    it('uses the `defaultBranchRef` as default', async () => {
      const options = await getOptions([], {});
      expect(options.sourceBranch).toBe('some-default-branch');
    });

    it('uses the sourceBranch given via cli instead of `defaultBranchRef`', async () => {
      const options = await getOptions(
        ['--source-branch', 'cli-source-branch'],
        {}
      );
      expect(options.sourceBranch).toBe('cli-source-branch');
    });
  });

  describe('fork', () => {
    beforeEach(() => {
      mockGithubConfigOptions({});
    });

    it('is enabled by default', async () => {
      const { fork } = await getOptions([], {});
      expect(fork).toBe(true);
    });

    it('can be disabled via `--no-fork` flag', async () => {
      const { fork } = await getOptions(['--no-fork'], {});
      expect(fork).toBe(false);
    });

    it('can be disabled via config file', async () => {
      mockProjectConfig({ fork: false });
      const { fork } = await getOptions([], {});
      expect(fork).toBe(false);
    });
  });

  describe('reviewers', () => {
    beforeEach(() => {
      mockGithubConfigOptions({});
    });

    it('can be set via `--reviewer` flag', async () => {
      const { reviewers } = await getOptions(['--reviewer', 'peter'], {});
      expect(reviewers).toEqual(['peter']);
    });

    it('can be set via config file', async () => {
      mockProjectConfig({ reviewers: ['john'] });
      const { reviewers } = await getOptions([], {});
      expect(reviewers).toEqual(['john']);
    });
  });

  describe('mainline', () => {
    beforeEach(() => {
      mockGithubConfigOptions({});
    });

    it('is not enabled by default', async () => {
      const { mainline } = await getOptions([], {});
      expect(mainline).toBe(undefined);
    });

    it('can be set via `--mainline` flag', async () => {
      const { mainline } = await getOptions(['--mainline'], {});
      expect(mainline).toBe(1);
    });

    it('accepts numeric values', async () => {
      const { mainline } = await getOptions(['--mainline', '2'], {});
      expect(mainline).toBe(2);
    });
  });

  describe('author', () => {
    beforeEach(() => {
      mockGithubConfigOptions({ viewerLogin: 'billy.bob' });
    });

    it('defaults to authenticated user', async () => {
      const { author } = await getOptions([], {});
      expect(author).toBe('billy.bob');
    });

    it('can be overridden via `--author` flag', async () => {
      const { author } = await getOptions(['--author', 'john.doe'], {});
      expect(author).toBe('john.doe');
    });

    it('can be reset via `--all` flag', async () => {
      const { author } = await getOptions(['--all'], {});
      expect(author).toBe(null);
    });

    it('can be reset via config file (similar to `--all` flag)', async () => {
      mockProjectConfig({ author: null });
      const { author } = await getOptions([], {});
      expect(author).toBe(null);
    });

    it('can be overridden via config file', async () => {
      mockProjectConfig({ author: 'jane.doe' });
      const { author } = await getOptions([], {});
      expect(author).toBe('jane.doe');
    });
  });

  describe('cherrypickRef', () => {
    beforeEach(() => {
      mockGithubConfigOptions({});
    });

    it('should default to true', async () => {
      const { cherrypickRef } = await getOptions([], {});
      expect(cherrypickRef).toBe(true);
    });

    it('should negate with `noCherrypickRef` cli arg', async () => {
      const { cherrypickRef } = await getOptions(['--no-cherrypick-ref'], {});
      expect(cherrypickRef).toBe(false);
    });

    it('should be settable via config file', async () => {
      mockProjectConfig({ cherrypickRef: false });
      const { cherrypickRef } = await getOptions([], {});
      expect(cherrypickRef).toBe(false);
    });

    it('cli args overwrites config', async () => {
      mockProjectConfig({ cherrypickRef: false });
      const { cherrypickRef } = await getOptions(['--cherrypick-ref'], {});
      expect(cherrypickRef).toBe(true);
    });
  });
});

function mockProjectConfig(projectConfig: ConfigFileOptions) {
  return mockConfigFiles({
    globalConfig: { accessToken: 'abc' },
    projectConfig: {
      // use localhost to avoid CORS issues with nock
      githubApiBaseUrlV4: 'http://localhost/graphql',
      repoOwner: 'elastic',
      repoName: 'kibana',
      targetBranchChoices: ['7.9', '8.0'],
      ...projectConfig,
    },
  });
}

function mockGithubConfigOptions({
  viewerLogin = 'DO_NOT_USE-sqren',
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
