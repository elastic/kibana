const Plugin = require('./plugin');

describe('Plugin.sanitize', () => {
  test('ensures that migrations are not undefined', () => {
    const plugins = [
      { id: 'a', migrations: [{ id: 'shazm', seed() {} }] },
      { id: 'b' },
      { id: 'c', mappings: { hello: { type: 'keyword ' } } },
    ];
    expect(Plugin.sanitize({ plugins })).toMatchSnapshot();
  });

  test('requires plugins to be specified', () => {
    expect(() => Plugin.sanitize({})).toThrowError();
  });

  test('requires plugins to have an id', () => {
    const plugins = [{ seed() { } }];
    expect(() => Plugin.sanitize({ plugins })).toThrowError(/"id" is required/);
  });
});
