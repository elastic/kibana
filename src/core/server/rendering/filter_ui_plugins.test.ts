/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DiscoveredPlugin, PluginName, UiPlugins } from '../plugins';
import { filterUiPlugins } from './filter_ui_plugins';

function createMockPlugin(params: Partial<DiscoveredPlugin>) {
  const { requiredPlugins, optionalPlugins, enabledOnAnonymousPages } = params;
  // other DiscoveredPlugin fields don't matter for this test suite
  return {
    requiredPlugins,
    optionalPlugins,
    enabledOnAnonymousPages,
  } as DiscoveredPlugin;
}

describe('filterUiPlugins', () => {
  const uiPlugins = {
    // other UiPlugin fields don't matter for this test suite
    public: new Map<PluginName, DiscoveredPlugin>()
      .set('one', createMockPlugin({ requiredPlugins: [] }))
      .set('two', createMockPlugin({ requiredPlugins: ['three'] }))
      .set('three', createMockPlugin({ requiredPlugins: ['four'], enabledOnAnonymousPages: true }))
      .set('four', createMockPlugin({ requiredPlugins: ['five'] }))
      .set('five', createMockPlugin({ requiredPlugins: [], optionalPlugins: ['six'] })) // optional plugin dependencies are ignored
      .set('six', createMockPlugin({ requiredPlugins: [] })),
  } as UiPlugins;

  it('does not filter any plugins when isAnonymousPage=false', () => {
    // The return value should contain all plugins in the same order.
    const result = filterUiPlugins({ uiPlugins, isAnonymousPage: false });
    expect(result.map(([id]) => id)).toEqual(['one', 'two', 'three', 'four', 'five', 'six']);
  });

  it('correctly filters plugins when isAnonymousPage=true', () => {
    // The return value should contain only (A) plugins that have enabledOnAnonymousPages=true, and (B) plugins that are required by A.
    // They should also still be in the same order.
    const result = filterUiPlugins({ uiPlugins, isAnonymousPage: true });
    expect(result.map(([id]) => id)).toEqual(['three', 'four', 'five']);
  });
});
