import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';
export declare const createBrowserConfig: <T = unknown>(config: T, descriptor: PluginConfigDescriptor<T>) => {
    browserConfig: Record<string, unknown>;
    exposedConfigKeys: Record<string, string>;
};
