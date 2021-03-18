/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IPluginScopedAPI, PluginScopedAPI } from './plugin_scoped_api';

describe('PluginScopedAPI', () => {
  test('should scope the API', () => {
    const myApi = jest.fn();
    const myScopeableApi = PluginScopedAPI.from(myApi);
    const myScopedApi = myScopeableApi.setScope('my_test_plugin');
    myScopedApi(1, 2, 3);
    expect(myApi).toHaveBeenCalledWith('my_test_plugin', 1, 2, 3);
  });

  test('scopes are not leaked', () => {
    const myApi = jest.fn();
    const myScopeableApi = PluginScopedAPI.from(myApi);
    const myScopedApiOne = myScopeableApi.setScope('my_test_plugin_1');
    const myScopedApiTwo = myScopeableApi.setScope('my_test_plugin_2');
    const myScopedApiThree = myScopeableApi.setScope('my_test_plugin_3');
    myScopedApiOne(1, 2, 3);
    expect(myApi).toHaveBeenCalledWith('my_test_plugin_1', 1, 2, 3);
    expect(myApi).not.toHaveBeenCalledWith('my_test_plugin_2', 1, 2, 3);
    expect(myApi).not.toHaveBeenCalledWith('my_test_plugin_3', 1, 2, 3);
    myScopedApiTwo(1, 2, 3);
    expect(myApi).toHaveBeenCalledWith('my_test_plugin_2', 1, 2, 3);
    expect(myApi).not.toHaveBeenCalledWith('my_test_plugin_3', 1, 2, 3);
    myScopedApiThree(1, 2, 3);
    expect(myApi).toHaveBeenCalledWith('my_test_plugin_3', 1, 2, 3);
  });

  test('type declarations', () => {
    // Allows empty params
    PluginScopedAPI.from(() => 1);

    // Allows one parameter only (as long as it's a string)
    PluginScopedAPI.from((pluginName: string) => 1);

    // Allows more parameters (as long as the first one is a string)
    PluginScopedAPI.from((pluginName: string, other: number, something: unknown) => 1);

    // Does not allow the first parameter to be other than string
    // @ts-expect-error
    PluginScopedAPI.from((someNumber: number) => 1);
    // @ts-expect-error
    PluginScopedAPI.from((someNumber: number, other: string, something: unknown) => 1);

    // ScopedAPI type:
    const scopeableApi = (pluginName: string, other: number, something: { a: string }) => 1;
    const myFunction = (scopedApi: IPluginScopedAPI<typeof scopeableApi>) =>
      scopedApi(1, { a: 'a' });
    expect(myFunction(PluginScopedAPI.from(scopeableApi).setScope('test'))).toBe(1);
  });
});
