import type { MaybePromise } from '@kbn/utility-types';
import type { CoreStart, CoreSetup } from '@kbn/core-lifecycle-browser';
/**
 * The interface that should be returned by a `PluginInitializer`.
 *
 * @public
 */
export interface Plugin<TSetup = void, TStart = void, TPluginsSetup extends Record<string, any> = never, TPluginsStart extends Record<string, any> = never> {
    setup(core: CoreSetup<TPluginsStart, TStart>, plugins: TPluginsSetup): TSetup;
    start(core: CoreStart, plugins: TPluginsStart): TStart;
    stop?(): MaybePromise<void>;
}
