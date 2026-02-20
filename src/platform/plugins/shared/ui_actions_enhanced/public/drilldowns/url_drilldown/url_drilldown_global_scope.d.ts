import type { CoreSetup } from '@kbn/core/public';
import type { UrlDrilldownGlobalScope } from './types';
interface UrlDrilldownGlobalScopeDeps {
    core: CoreSetup;
}
export declare function globalScopeProvider({ core, }: UrlDrilldownGlobalScopeDeps): () => UrlDrilldownGlobalScope;
export {};
