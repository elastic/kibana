import type { ESQLAstAllCommands, ESQLAstFuseCommand, ESQLCommand, ESQLCommandOption, ESQLIdentifier } from '@elastic/esql/types';
import type { ESQLMessage } from '../../definitions/types';
export declare const FUSE_OPTIONS: readonly ["score by", "key by", "group by", "with"];
export type FuseOption = (typeof FUSE_OPTIONS)[number];
export declare function extractFuseArgs(command: ESQLAstFuseCommand): Partial<{
    fuseType: ESQLIdentifier;
    scoreBy: ESQLCommandOption;
    keyBy: ESQLCommandOption;
    groupBy: ESQLCommandOption;
    withOption: ESQLCommandOption;
}>;
export declare function findCommandOptionByName(command: ESQLCommand, name: FuseOption): ESQLCommandOption | undefined;
/**
 * Checks if we are immediately after a field that belongs to an option.
 * This is useful for being able to decide we are still in the SCORE BY position.
 *
 * Example: "SCORE BY field_name/"  returns true
 *          "SCORE BY field_name /" returns false
 */
export declare function immediatelyAfterOptionField(innerText: string, optionName: FuseOption): boolean;
/**
 * Checks if we are immediately after a field in a list of fields that belongs to an option
 * Example: "KEY BY field1, field2/"  returns true
 *          "KEY BY field1, field2 /" returns false
 */
export declare function immediatelyAfterOptionFieldsList(innerText: string, optionName: FuseOption): boolean;
export declare function buildMissingMetadataMessage(command: ESQLAstAllCommands, metadataField: string): ESQLMessage;
