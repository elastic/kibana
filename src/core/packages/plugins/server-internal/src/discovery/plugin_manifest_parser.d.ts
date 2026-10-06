import type { PackageInfo } from '@kbn/config';
import type { PluginManifest } from '@kbn/core-plugins-server';
/**
 * Tries to load and parse the plugin manifest file located at the provided plugin
 * directory path and produces an error result if it fails to do so or plugin manifest
 * isn't valid.
 * @param pluginPath Path to the plugin directory where manifest should be loaded from.
 * @param packageInfo Kibana package info.
 * @internal
 */
export declare function parseManifest(pluginPath: string, packageInfo: PackageInfo): Promise<PluginManifest>;
