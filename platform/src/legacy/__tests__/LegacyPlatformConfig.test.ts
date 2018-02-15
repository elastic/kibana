import { LegacyConfigToRawConfigAdapter } from '..';
import { LegacyConfigMock } from '../__mocks__/LegacyConfigMock';

let legacyConfigMock: LegacyConfigMock;
let configAdapter: LegacyConfigToRawConfigAdapter;
beforeEach(() => {
  legacyConfigMock = new LegacyConfigMock(
    new Map<string, any>([['__newPlatform', null]])
  );
  configAdapter = new LegacyConfigToRawConfigAdapter(legacyConfigMock);
});

describe('#get', () => {
  test('correctly handles paths that do not exist in legacy config.', () => {
    expect(() => configAdapter.get('one')).toThrowErrorMatchingSnapshot();
    expect(() =>
      configAdapter.get(['one', 'two'])
    ).toThrowErrorMatchingSnapshot();
    expect(() =>
      configAdapter.get(['one.three'])
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns undefined for new platform config values, even if they do not exist', () => {
    expect(configAdapter.get(['__newPlatform', 'plugins'])).toBe(undefined);
  });

  test('returns new platform config values if they exist', () => {
    configAdapter = new LegacyConfigToRawConfigAdapter(
      new LegacyConfigMock(
        new Map<string, any>([
          ['__newPlatform', { plugins: { scanDirs: ['foo'] } }],
        ])
      )
    );
    expect(configAdapter.get(['__newPlatform', 'plugins'])).toEqual({
      scanDirs: ['foo'],
    });
    expect(configAdapter.get('__newPlatform.plugins')).toEqual({
      scanDirs: ['foo'],
    });
  });

  test('correctly handles paths that do not need to be transformed.', () => {
    legacyConfigMock.__rawData = new Map<string, any>([
      ['one', 'value-one'],
      ['one.sub', 'value-one-sub'],
      ['container', { value: 'some' }],
    ]);

    expect(configAdapter.get('one')).toEqual('value-one');
    expect(configAdapter.get(['one', 'sub'])).toEqual('value-one-sub');
    expect(configAdapter.get('one.sub')).toEqual('value-one-sub');
    expect(configAdapter.get('container')).toEqual({ value: 'some' });
  });

  test('correctly handles silent logging config.', () => {
    legacyConfigMock.__rawData = new Map([['logging', { silent: true }]]);

    expect(configAdapter.get('logging')).toEqual({
      root: { level: 'off' },
      appenders: {
        default: { kind: 'legacy-appender' },
      },
    });
  });

  test('correctly handles verbose file logging config with json format.', () => {
    legacyConfigMock.__rawData = new Map([
      ['logging', { verbose: true, json: true, dest: '/some/path.log' }],
    ]);

    expect(configAdapter.get('logging')).toEqual({
      root: { level: 'all' },
      appenders: {
        default: { kind: 'legacy-appender' },
      },
    });
  });
});

describe('#set', () => {
  test('tries to set values for paths that do not exist in legacy config.', () => {
    expect(() =>
      configAdapter.set('unknown', 'value')
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      configAdapter.set(['unknown', 'sub1'], 'sub-value-1')
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      configAdapter.set('unknown.sub2', 'sub-value-2')
    ).toThrowErrorMatchingSnapshot();
  });

  test('correctly sets values for existing paths.', () => {
    legacyConfigMock.__rawData = new Map([
      ['known', ''],
      ['known.sub1', ''],
      ['known.sub2', ''],
    ]);

    configAdapter.set('known', 'value');
    configAdapter.set(['known', 'sub1'], 'sub-value-1');
    configAdapter.set('known.sub2', 'sub-value-2');

    expect(legacyConfigMock.__rawData.get('known')).toEqual('value');
    expect(legacyConfigMock.__rawData.get('known.sub1')).toEqual('sub-value-1');
    expect(legacyConfigMock.__rawData.get('known.sub2')).toEqual('sub-value-2');
  });

  test('correctly sets values for new platform config.', () => {
    const legacyConfigMock = new LegacyConfigMock(
      new Map<string, any>([
        ['__newPlatform', { plugins: { scanDirs: ['foo'] } }],
      ])
    );
    configAdapter = new LegacyConfigToRawConfigAdapter(legacyConfigMock);

    configAdapter.set(['__newPlatform', 'plugins', 'scanDirs'], ['bar']);
    expect(legacyConfigMock.__rawData.get('__newPlatform')).toMatchSnapshot();

    configAdapter.set('__newPlatform.plugins.scanDirs', ['baz']);
    expect(legacyConfigMock.__rawData.get('__newPlatform')).toMatchSnapshot();
  });
});

describe('#has', () => {
  test('returns false if config is not set', () => {
    expect(configAdapter.has('unknown')).toBe(false);
    expect(configAdapter.has(['unknown', 'sub1'])).toBe(false);
    expect(configAdapter.has('unknown.sub2')).toBe(false);
  });

  test('returns false if new platform config is not set', () => {
    expect(configAdapter.has('__newPlatform.unknown')).toBe(false);
    expect(configAdapter.has(['__newPlatform', 'unknown'])).toBe(false);
  });

  test('returns true if config is set.', () => {
    legacyConfigMock.__rawData = new Map([
      ['known', 'foo'],
      ['known.sub1', 'bar'],
      ['known.sub2', 'baz'],
    ]);

    expect(configAdapter.has('known')).toBe(true);
    expect(configAdapter.has(['known', 'sub1'])).toBe(true);
    expect(configAdapter.has('known.sub2')).toBe(true);
  });

  test('returns true if new platform config is set.', () => {
    const legacyConfigMock = new LegacyConfigMock(
      new Map<string, any>([
        ['__newPlatform', { known: 'foo', known2: { sub: 'bar' } }],
      ])
    );
    configAdapter = new LegacyConfigToRawConfigAdapter(legacyConfigMock);

    expect(configAdapter.has('__newPlatform.known')).toBe(true);
    expect(configAdapter.has('__newPlatform.known2')).toBe(true);
    expect(configAdapter.has('__newPlatform.known2.sub')).toBe(true);
    expect(configAdapter.has(['__newPlatform', 'known'])).toBe(true);
    expect(configAdapter.has(['__newPlatform', 'known2'])).toBe(true);
    expect(configAdapter.has(['__newPlatform', 'known2', 'sub'])).toBe(true);
  });
});

test('`getFlattenedPaths` returns paths from new platform config only.', () => {
  const legacyConfigMock = new LegacyConfigMock(
    new Map<string, any>([
      ['__newPlatform', { known: 'foo', known2: { sub: 'bar' } }],
      ['legacy', { known: 'baz' }],
    ])
  );
  configAdapter = new LegacyConfigToRawConfigAdapter(legacyConfigMock);

  expect(configAdapter.getFlattenedPaths()).toMatchSnapshot();
});
