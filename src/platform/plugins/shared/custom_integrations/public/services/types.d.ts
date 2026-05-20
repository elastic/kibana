import type { CoreStart } from '@kbn/core/public';
/**
 * Parameters necessary to create a Kibana-based service, (e.g. during Plugin
 * startup or setup).
 *
 * The `Start` generic refers to the specific Plugin `TPluginsStart`.
 */
export interface KibanaPluginServiceParams<Start extends {}> {
    coreStart: CoreStart;
    startPlugins: Start;
}
/**
 * A factory function for creating a Kibana-based service.
 *
 * The `Service` generic determines the shape of the Service being produced.
 * The `Start` generic refers to the specific Plugin `TPluginsStart`.
 */
export type KibanaPluginServiceFactory<Service, Start extends {}> = (params: KibanaPluginServiceParams<Start>) => Service;
/**
 * A factory function for creating a stubbed service
 */
export type PluginServiceFactory<Service, Params extends {} = {}> = (params: Params) => Service;
