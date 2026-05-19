import type { Observable } from 'rxjs';
import type { SharedUXExecutionContext } from './types';
/**
 * @public Execution context start and setup types are the same
 */
export declare type SharedUXExecutionContextStart = SharedUXExecutionContextSetup;
/**
 * Reduced the interface from ExecutionContextSetup from '@kbn/core-execution-context-browser' to only include properties needed for the Route
 */
export interface SharedUXExecutionContextSetup {
    /**
     * The current context observable
     **/
    context$: Observable<SharedUXExecutionContext>;
    /**
     * Set the current top level context
     **/
    set(c$: SharedUXExecutionContext): void;
    /**
     * Get the current top level context
     **/
    get(): SharedUXExecutionContext;
    /**
     * clears the context
     **/
    clear(): void;
}
/**
 * Taken from Core services exposed to the `Plugin` start lifecycle
 *
 * @public
 *
 * @internalRemarks We document the properties with
 * \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface SharedUXExecutionContextSetup {
    /** {@link SharedUXExecutionContextSetup} */
    executionContext?: SharedUXExecutionContextStart;
}
export type KibanaServices = Partial<SharedUXExecutionContextSetup>;
export interface SharedUXRouterContextValue<Services extends KibanaServices> {
    readonly services: Services;
}
export declare const SharedUXRouterContext: import("react").Context<SharedUXRouterContextValue<Partial<SharedUXExecutionContextSetup>>>;
export declare const useKibanaSharedUX: <Extra extends object = {}>() => SharedUXRouterContextValue<KibanaServices & Extra>;
