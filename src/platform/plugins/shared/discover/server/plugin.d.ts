import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { DiscoverServerPluginStart, DiscoverServerPluginStartDeps } from '.';
import type { ConfigSchema } from './config';
export declare class DiscoverServerPlugin implements Plugin<object, DiscoverServerPluginStart, object, DiscoverServerPluginStartDeps> {
    private readonly config;
    private subscriptions;
    private embeddableTransformsEnabled;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup, plugins: {
        agentBuilder?: AgentBuilderPluginSetup;
        data: DataPluginSetup;
        embeddable: EmbeddableSetup;
        home?: HomeServerPluginSetup;
        share?: SharePluginSetup;
    }): {};
    start(core: CoreStart, deps: DiscoverServerPluginStartDeps): {
        locator: import(".").DiscoverServerPluginLocatorService;
    };
    stop(): void;
}
