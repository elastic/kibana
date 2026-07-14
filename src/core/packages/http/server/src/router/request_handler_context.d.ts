import type { AwaitedProperties } from '@kbn/utility-types';
/**
 * Base, abstract type for request handler contexts.
 * @public
 **/
export interface RequestHandlerContextBase {
    /**
     * Await all the specified context parts and return them.
     *
     * @example
     * ```ts
     * const resolved = await context.resolve(['core', 'pluginA']);
     * const esClient = resolved.core.elasticsearch.client;
     * const pluginAService = resolved.pluginA.someService;
     * ```
     */
    resolve: <T extends keyof Omit<this, 'resolve'>>(parts: T[]) => Promise<AwaitedProperties<Pick<this, T>>>;
}
