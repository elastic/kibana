import { resolve } from 'path';

import { loadPluginProvider } from './plugin_provider';
import { PLUGINS_DIR, PluginsDirStringSerializer } from './__fixtures__/utils';

expect.addSnapshotSerializer(PluginsDirStringSerializer);

const KIBANA_JSON = {
  id: 'foo',
  version: 'bar',
  dependencies: []
};

describe('loadPluginProvider()', () => {
  it('throws InvalidPluginError if plugin does not have an index.js file', () => {
    expect(() => loadPluginProvider(KIBANA_JSON, resolve(PLUGINS_DIR, 'broken'))).toThrowErrorMatchingSnapshot();
  });

  it('throws InvalidPluginError if provider is not a function', () => {
    expect(() => loadPluginProvider(KIBANA_JSON, resolve(PLUGINS_DIR, 'exports_number'))).toThrowErrorMatchingSnapshot();
  });

  it('handles prebuilt providers with __esModule', () => {
    expect(typeof loadPluginProvider(KIBANA_JSON, resolve(PLUGINS_DIR, 'prebuilt'))).toBe('function');
  });

  it('support main field in package.json', () => {
    const provider = loadPluginProvider(KIBANA_JSON, resolve(PLUGINS_DIR, 'use_main_field'));
    expect(provider()).toBe('foo');
  });
});
