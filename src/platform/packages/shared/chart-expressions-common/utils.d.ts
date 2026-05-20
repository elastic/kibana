import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export declare const extractContainerType: (context?: KibanaExecutionContext) => string | undefined;
export declare const isOnAggBasedEditor: (context?: KibanaExecutionContext) => boolean;
export declare const extractVisualizationType: (context?: KibanaExecutionContext) => string | undefined;
/**
 * Get an override specification and returns a props object to use directly with the Component
 * @param overrides Overrides object
 * @param componentName name of the Component to look for (i.e. "settings", "axisX")
 * @returns an props object to use directly with the component
 */
export declare function getOverridesFor<P extends Record<string, unknown>, O extends Record<string, P>, K extends keyof O>(overrides: O | undefined, componentName: K): {
    [k: string]: unknown;
};
