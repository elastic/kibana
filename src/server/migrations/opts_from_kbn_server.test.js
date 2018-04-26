const _ = require('lodash');
const { optsFromKbnServer } = require('./opts_from_kbn_server');

describe('optsFromKbnServer', () => {
  test('returns opts as expected by the migration engine', () => {
    const callCluster = () => {};
    const pluginSpecs = [{
      getId: () => 'foo',
      getExportSpecs: () => ({ mappings: { foo: 'bar' } }),
      getMigrations: () => [{ id: 'migrateme' }],
    }];
    const server = {
      plugins: {
        elasticsearch: {
          getCluster(name) {
            expect(name).toEqual('admin');
            return {
              callWithInternalUser: callCluster,
            };
          },
        },
      },
      config: () => ({
        get(arg) {
          expect(arg).toEqual('kibana.index');
          return 'magicalindex';
        },
      }),
    };
    const version = '2.3.4';
    const opts = optsFromKbnServer({ pluginSpecs, server, version });
    expect(opts.callCluster).toEqual(callCluster);
    expect(opts.elasticVersion).toEqual('2.3.4');
    expect(opts.index).toEqual('magicalindex');
    expect(opts.plugins).toEqual([{
      id: 'foo',
      mappings: { foo: 'bar' },
      migrations: [{ id: 'migrateme' }],
    }]);
  });

  test('returns the specified callCluster function', () => {
    const callCluster = () => {};
    const pluginSpecs = [{
      getId: () => 'foo',
      getExportSpecs: () => ({ mappings: { foo: 'bar' } }),
      getMigrations: () => [{ id: 'migrateme' }],
    }];
    const server = {
      config: () => ({
        get(arg) {
          expect(arg).toEqual('kibana.index');
          return 'magicalindex';
        },
      }),
    };
    const version = '2.3.4';
    const opts = optsFromKbnServer({ pluginSpecs, server, version }, callCluster);
    expect(opts.callCluster).toEqual(callCluster);
  });

  test('handles undefined mappings', async () => {
    const pluginSpecs = [{
      getId: () => 'foo',
      getExportSpecs: () => undefined,
      getMigrations: () => [{ id: 'migrateme' }],
    }];
    const server = {
      config: () => ({
        get(arg) {
          expect(arg).toEqual('kibana.index');
          return 'magicalindex';
        },
      }),
    };
    const version = '2.3.4';
    const opts = optsFromKbnServer({ pluginSpecs, server, version }, _.noop);
    expect(opts.plugins).toEqual([{
      id: 'foo',
      mappings: undefined,
      migrations: [{ id: 'migrateme' }],
    }]);
  });

  test('returns a log function that proxies the server log function', async () => {
    const logs = [];
    const server = {
      log(...args) {
        logs.push(args);
      },
      config: () => ({
        get(arg) {
          expect(arg).toEqual('kibana.index');
          return 'magicalindex';
        },
      }),
    };
    const version = '2.3.4';
    const opts = optsFromKbnServer({ pluginSpecs: [], server, version }, _.noop);
    opts.log('hey', 'there!');
    expect(logs).toEqual([['hey', 'there!']]);
  });
});
