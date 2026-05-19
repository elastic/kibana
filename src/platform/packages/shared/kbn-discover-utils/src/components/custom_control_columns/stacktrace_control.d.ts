import type { RowControlColumn, RowControlProps } from './types';
/**
 * Stacktrace control factory function.
 * @param props Optional props for the generated Control component, useful to override onClick, etc
 */
export declare const createStacktraceControl: (props?: Partial<RowControlProps>) => RowControlColumn;
