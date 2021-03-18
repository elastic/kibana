/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type PluginScopeableAPI = (pluginName: string, ...args: any[]) => any;

export type PluginScopedApiArgs<API extends PluginScopeableAPI> = API extends (
  pluginName: string,
  ...args: infer Args
) => any
  ? Args
  : never;

export type PluginScopedApiResult<API extends PluginScopeableAPI> = API extends (
  pluginName: string,
  ...args: any
) => infer Result
  ? Result
  : never;

export type IPluginScopedAPI<API extends PluginScopeableAPI> = (
  ...args: PluginScopedApiArgs<API>
) => PluginScopedApiResult<API>;

export class PluginScopedAPI<API extends PluginScopeableAPI> {
  public static from<CustomAPI extends PluginScopeableAPI>(api: CustomAPI) {
    return new PluginScopedAPI<CustomAPI>(api);
  }

  private constructor(private readonly api: API) {}

  public setScope(pluginName: string): IPluginScopedAPI<API> {
    return (...args: PluginScopedApiArgs<API>) => this.api(pluginName, ...args);
  }
}
