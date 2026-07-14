import type { Observable } from 'rxjs';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export type LabelValue = string | number | boolean;
export interface Labels {
    [key: string]: LabelValue;
}
/**
 * Kibana execution context.
 * Used to provide execution context to Elasticsearch, reporting, performance monitoring, etc.
 * @public
 **/
export interface ExecutionContextSetup {
    /**
     * The current context observable
     **/
    context$: Observable<KibanaExecutionContext>;
    /**
     * Set the current top level context
     **/
    set(c$: KibanaExecutionContext): void;
    /**
     * Get the current top level context
     **/
    get(): KibanaExecutionContext;
    /**
     * clears the context
     **/
    clear(): void;
    /**
     * returns apm labels
     **/
    getAsLabels(): Labels;
    /**
     * merges the current top level context with the specific event context
     **/
    withGlobalContext(context?: KibanaExecutionContext): KibanaExecutionContext;
}
/**
 * See {@link ExecutionContextSetup}.
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;
