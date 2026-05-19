import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PluginName } from '@kbn/core-base-common';
import type { PluginContractResolverResponse, PluginContractMap } from '@kbn/core-plugins-contracts-browser';
export type IRuntimePluginContractResolver = PublicMethodsOf<RuntimePluginContractResolver>;
export declare class RuntimePluginContractResolver {
    private dependencyMap?;
    private setupContracts?;
    private startContracts?;
    private readonly setupRequestQueue;
    private readonly startRequestQueue;
    setDependencyMap(depMap: Map<PluginName, Set<PluginName>>): void;
    onSetup: <T extends PluginContractMap>(pluginName: PluginName, dependencyNames: Array<keyof T>) => Promise<PluginContractResolverResponse<T>>;
    onStart: <T extends PluginContractMap>(pluginName: PluginName, dependencyNames: Array<keyof T>) => Promise<PluginContractResolverResponse<T>>;
    resolveSetupRequests(setupContracts: Map<PluginName, unknown>): void;
    resolveStartRequests(startContracts: Map<PluginName, unknown>): void;
}
