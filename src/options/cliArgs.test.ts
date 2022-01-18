import { getOptionsFromCliArgs } from './cliArgs';

describe('getOptionsFromCliArgs', () => {
  describe('yargs settings', () => {
    it('should accept both camel-case and dashed-case and convert them to camel cased', () => {
      const argv = [
        '--access-token',
        'my access token',
        '--githubApiBaseUrlV3',
        'my api hostname',
      ];

      const res = getOptionsFromCliArgs(argv);
      expect(res.accessToken).toEqual('my access token');
      expect('access-token' in res).toEqual(false);
      expect(res.githubApiBaseUrlV3).toEqual('my api hostname');
      expect('api-hostname' in res).toEqual(false);
    });

    it('strips undefined values from the object', () => {
      const argv = [
        '--access-token',
        'my access token',
        '--repo-owner',
        'elastic',
        '--repo-name',
        'kibana',
      ];
      const res = getOptionsFromCliArgs(argv);
      expect(res).toEqual({
        accessToken: 'my access token',
        repoOwner: 'elastic',
        repoName: 'kibana',
      });
    });
  });

  // blocked by: https://github.com/yargs/yargs/issues/1853
  describe('help', () => {
    // eslint-disable-next-line jest/no-commented-out-tests
    //   it('should output help', () => {
    //     const argv = ['--help'];
    //     expect(() =>
    //       getOptionsFromCliArgs(argv, { exitOnError: false, returnHelp: true })
    //     ).toThrow('asa');
    //   });
  });

  describe('sourcePRLabels', () => {
    it('should handle all variations', () => {
      const argv = [
        '--sourcePRLabel',
        'label a',
        '--sourcePrLabel',
        'label b',
        '--source-pr-label',
        'label c',
      ];

      const res = getOptionsFromCliArgs(argv);
      expect(res.sourcePRLabels).toEqual(['label a', 'label b', 'label c']);
    });
  });

  describe('pullNumber', () => {
    it('should accept `--pr` alias but only return the full representation (`pullNumber`)', () => {
      const argv = ['--pr', '1337'];

      const res = getOptionsFromCliArgs(argv);

      expect(res.pullNumber).toEqual(1337);

      //@ts-expect-error
      expect(res.pr).toBe(undefined);
    });
  });

  describe('assignees', () => {
    it('--assignee', () => {
      const argv = ['--assignee', 'john'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.assignees).toEqual(['john']);
    });

    it('--assign', () => {
      const argv = ['--assign', 'john'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.assignees).toEqual(['john']);
    });
  });

  describe('multipleBranches', () => {
    it('should be undefined by default', () => {
      const argv = [] as const;
      const res = getOptionsFromCliArgs(argv);
      expect(res.multipleBranches).toBe(undefined);
    });

    it('should set to true', () => {
      const argv = ['--multiple-branches', 'true'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.multipleBranches).toBe(true);
    });

    it('should set to false', () => {
      const argv = ['--multiple-branches', 'false'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.multipleBranches).toBe(false);
    });

    it('should respect `multiple` option', () => {
      const argv = ['--multiple'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.multipleBranches).toBe(true);
    });

    it('should conflict when using both', () => {
      const argv = ['--multiple', '--multiple-branches', 'false'];

      expect(() => getOptionsFromCliArgs(argv, { exitOnError: false })).toThrow(
        'Arguments multiple and multipleBranches are mutually exclusive'
      );
    });
  });

  describe('noVerify', () => {
    it('should be undefined by default', () => {
      const argv = [] as const;
      const res = getOptionsFromCliArgs(argv);
      expect(res.noVerify).toBe(undefined);
    });

    it('should set to false', () => {
      const argv = ['--no-verify', 'false'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.noVerify).toBe(false);
    });

    it('should set to true', () => {
      const argv = ['--no-verify', 'true'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.noVerify).toBe(true);
    });

    it('should be enabled by `verify`', () => {
      const argv = ['--verify'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.noVerify).toBe(true);
    });
  });

  describe('mainline', () => {
    it('should default to 1', () => {
      const argv = ['--mainline'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.mainline).toEqual(1);
    });

    it('should accept numbers', () => {
      const argv = ['--mainline', '2'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.mainline).toEqual(2);
    });

    it('should throw on invalid values', () => {
      const argv = ['--mainline', 'foo'];
      expect(() =>
        getOptionsFromCliArgs(argv, { exitOnError: false })
      ).toThrowError('--mainline must be an integer. Received: NaN');
    });
  });

  describe('targetBranches', () => {
    it('should not coerce 6.0 to 6', () => {
      const argv = ['-b', '6.0'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.targetBranches).toEqual(['6.0']);
    });
  });

  describe('since/until', () => {
    it('should always be UTC time (configured globally in jest.config.js)', () => {
      expect(new Date().getTimezoneOffset()).toBe(0);
    });

    it('accepts ISO dates', () => {
      const argv = [
        '--since',
        '2020-08-15T00:00:00.000Z',
        '--until',
        '2020-08-15T14:00:00.000Z',
      ];
      const res = getOptionsFromCliArgs(argv);
      expect(res.dateSince).toEqual('2020-08-15T00:00:00.000Z');
      expect(res.dateUntil).toEqual('2020-08-15T14:00:00.000Z');
    });

    it('accepts non-ISO dates', () => {
      const argv = ['--since', '2020-08-15', '--until', '2020-08-15 14:00'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.dateSince).toEqual('2020-08-15T00:00:00.000Z');
      expect(res.dateUntil).toEqual('2020-08-15T14:00:00.000Z');
    });

    it('accepts years', () => {
      const argv = ['--since', '2020', '--until', '2021'];
      const res = getOptionsFromCliArgs(argv);
      expect(res.dateSince).toEqual('2020-01-01T00:00:00.000Z');
      expect(res.dateUntil).toEqual('2021-01-01T00:00:00.000Z');
    });
  });
});
