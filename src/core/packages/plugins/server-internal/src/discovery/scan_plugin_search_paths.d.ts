import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { PluginDiscoveryError } from './plugin_discovery_error';
/**
 * Recursively iterates over every plugin search path and returns a merged stream of all
 * sub-directories containing a manifest file. If directory cannot be read or it's impossible to get stat
 * for any of the nested entries then error is added into the stream instead.
 *
 * @param pluginDirs List of the top-level directories to process.
 * @param log Plugin discovery logger instance.
 */
export declare function scanPluginSearchPaths(pluginDirs: readonly string[], log: Logger): Observable<string | PluginDiscoveryError>;
