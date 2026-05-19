import type { ShallowPromise } from '@kbn/utility-types';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { CoreId } from '@kbn/core-base-common-internal';
import type { RequestHandler, RequestHandlerContextBase, IContextProvider, IContextContainer, HandlerParameters } from '@kbn/core-http-server';
/** @internal */
export declare class ContextContainer implements IContextContainer {
    private readonly pluginDependencies;
    private readonly coreId;
    /**
     * Used to map contexts to their providers and associated plugin. In registration order which is tightly coupled to
     * plugin load order.
     */
    private readonly contextProviders;
    /** Used to keep track of which plugins registered which contexts for dependency resolution. */
    private readonly contextNamesBySource;
    /**
     * @param pluginDependencies - A map of plugins to an array of their dependencies.
     */
    constructor(pluginDependencies: ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]>, coreId: CoreId);
    registerContext: <Context extends RequestHandlerContextBase, ContextName extends keyof Context>(source: symbol, name: ContextName, provider: IContextProvider<Context, ContextName>) => this;
    createHandler: (source: symbol, handler: RequestHandler) => (...args: HandlerParameters<RequestHandler>) => ShallowPromise<ReturnType<RequestHandler>>;
    private buildContext;
    private getContextNamesForSource;
    private getContextNamesForCore;
    private getContextNamesForPluginId;
}
