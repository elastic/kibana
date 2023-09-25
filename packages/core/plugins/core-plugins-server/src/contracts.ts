/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginName } from '@kbn/core-base-common';

/**
 *
 * @public
 */
export interface PluginsServiceSetup {
  onSetup: PluginContractResolver;
  onStart: PluginContractResolver;
}

/**
 *
 * @public
 */
export interface PluginsServiceStart {
  onStart: PluginContractResolver;
}

/**
 *
 * @public
 */
export type PluginContractResolverResponseItem<ContractType = unknown> =
  | { found: false }
  | { found: true; contract: ContractType };

/**
 *
 * @public
 */
export type PluginContractMap = Record<PluginName, unknown>;

/**
 *
 * @public
 */
export type PluginContractResolverResponse<ContractMap extends PluginContractMap> = {
  [Key in keyof ContractMap]: PluginContractResolverResponseItem<ContractMap[Key]>;
};

export type PluginContractResolver = <T extends PluginContractMap>(
  ...pluginNames: Array<keyof T>
) => Promise<PluginContractResolverResponse<T>>;

/*
type SomeType = {
  foo: string;
  bar: number;
};

let a: PluginContractResolver = 12 as any;

const result = await a<SomeType>('foo', 'bar')

result.bar.exists && result.bar.contract
*/
