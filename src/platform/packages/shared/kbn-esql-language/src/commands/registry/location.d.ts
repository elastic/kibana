import type { ESQLAst, ESQLAstAllCommands, ESQLSingleAstItem } from '@elastic/esql/types';
import type { Location } from './types';
/**
 * Pause before using this in new places. Where possible, use the Location enum directly.
 *
 * This is primarily around for backwards compatibility with the old system of command and option names.
 */
export declare const getLocationFromCommandOrOptionName: (name: string) => Location;
/**
 * Identifies the location ID at the given position
 */
export declare function getLocationInfo(position: ESQLSingleAstItem | number, parentCommand: ESQLAstAllCommands, ast: ESQLAst, withinAggFunction: boolean): {
    id: Location;
    displayName: string;
};
