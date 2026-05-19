import type { ESQLAstCommand } from '@elastic/esql/types';
/**
 * Checks if the source command in the AST is a timeseries command (e.g. TS).
 * Finds the source command dynamically rather than assuming it's at index 0.
 */
export declare const isTimeseriesSourceCommand: (ast: ESQLAstCommand[]) => boolean;
