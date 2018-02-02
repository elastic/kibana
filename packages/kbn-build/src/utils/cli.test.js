import { parseArgv, hasDashDash, createExtraArgs } from './cli';

describe('createExtraArgs', () => {
  test('handles unknown args as extra args', () => {
    const argv = [
      '--skip-kibana',
      'run',
      'build',
      '--frozen-lockfile',
      '--value',
      'test'
    ];

    const options = parseArgv(argv);

    expect(createExtraArgs(options)).toEqual([
      'build',
      '--frozen-lockfile',
      '--value test'
    ]);
  });

  test('handles no unknown args', () => {
    const argv = [
      'bootstrap',
      '--skip-kibana',
      '--skip-kibana-extra'
    ];

    const options = parseArgv(argv);

    expect(createExtraArgs(options)).toEqual([]);
  });
});

describe('hasDashDash', () => {
  test('returns true if "-- --arg" present', () => {
    const argv = [
      'bootstrap',
      '--',
      '--frozen-lockfile'
    ];

    expect(hasDashDash(argv)).toEqual(true);
  });

  test('returns false if "-- --arg" not resent', () => {
    const argv = [
      'bootstrap',
      '--frozen-lockfile'
    ];

    expect(hasDashDash(argv)).toEqual(false);
  });
});
