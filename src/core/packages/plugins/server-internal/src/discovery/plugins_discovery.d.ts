import type { CoreContext } from '@kbn/core-base-server-internal';
import type { NodeInfo } from '@kbn/core-node-server';
import { PluginWrapper } from '../plugin';
import type { InstanceInfo } from '../plugin_context';
import type { PluginsConfig } from '../plugins_config';
import type { PluginDiscoveryError } from './plugin_discovery_error';
/**
 * Tries to discover all possible plugins based on the provided plugin config.
 * Discovery result consists of two separate streams, the one (`plugin$`) is
 * for the successfully discovered plugins and the other one (`error$`) is for
 * all the errors that occurred during discovery process.
 *
 * @param config Plugin config instance.
 * @param coreContext Kibana core values.
 * @internal
 */
export declare function discover({ config, coreContext, instanceInfo, nodeInfo, }: {
    config: PluginsConfig;
    coreContext: CoreContext;
    instanceInfo: InstanceInfo;
    nodeInfo: NodeInfo;
}): {
    plugin$: import("rxjs").Observable<PluginWrapper<unknown, unknown, object, object>>;
    error$: import("rxjs").Observable<PluginDiscoveryError>;
};
