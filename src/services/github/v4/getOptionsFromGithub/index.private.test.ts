import { OptionsFromCliArgs } from '../../../../options/cliArgs';
import { OptionsFromConfigFiles } from '../../../../options/config/config';
import { getDevAccessToken } from '../../../../test/private/getDevAccessToken';
import { getOptionsFromGithub } from '.';

describe('getOptionsFromGithub', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('accessToken is invalid', () => {
    it('throws an error', async () => {
      const optionsFromConfigFiles = {
        username: 'sqren',
        accessToken: 'foo',
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        upstream: 'backport-org/backport-e2e',
      } as OptionsFromConfigFiles;
      const optionsFromCliArgs = {} as OptionsFromCliArgs;

      await expect(
        getOptionsFromGithub(optionsFromConfigFiles, optionsFromCliArgs)
      ).rejects.toThrowError(
        'Please check your access token and make sure it is valid.\nConfig: /myHomeDir/.backport/config.json'
      );
    });
  });

  describe('accessToken is valid', () => {
    it('returns the default branch', async () => {
      const optionsFromConfigFiles = {
        username: 'sqren',
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        upstream: 'backport-org/backport-e2e',
      } as OptionsFromConfigFiles;
      const optionsFromCliArgs = {} as OptionsFromCliArgs;

      expect(
        await getOptionsFromGithub(optionsFromConfigFiles, optionsFromCliArgs)
      ).toEqual({
        branchLabelMapping: {
          '^v(\\d+).(\\d+).\\d+$': '$1.$2',
          '^v7.9.0$': '7.x',
          '^v8.0.0$': 'master',
        },
        sourceBranch: 'master',
        targetBranchChoices: [
          { checked: true, name: 'master' },
          { checked: true, name: '7.x' },
          '7.8',
        ],
        targetPRLabels: ['backport'],
        upstream: 'backport-org/backport-e2e',
      });
    });
  });
});
