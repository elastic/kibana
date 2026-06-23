import type { ESQLAstAllCommands } from '@elastic/esql/types';
export declare function isAggFunctionUsedAlready(command: ESQLAstAllCommands, argIndex: number): boolean;
export declare function isTimeseriesAggUsedAlready(command: ESQLAstAllCommands, argIndex: number): boolean;
export declare function getFunctionsToIgnoreForStats(command: ESQLAstAllCommands, argIndex: number): string[];
