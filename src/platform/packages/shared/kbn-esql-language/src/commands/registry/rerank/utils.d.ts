import type { ESQLSingleAstItem, ESQLAstAllCommands } from '@elastic/esql/types';
export interface PositionContext {
    expressionRoot?: ESQLSingleAstItem;
}
export declare enum CaretPosition {
    RERANK_KEYWORD = 0,// After RERANK: can be target field assignment or query
    RERANK_AFTER_TARGET_FIELD = 1,// After potential target field: suggest assignment operator
    RERANK_AFTER_TARGET_ASSIGNMENT = 2,// After "target_field ="
    ON_KEYWORD = 3,// Should suggest "ON"
    ON_EXPRESSION = 4,// After "ON": handle all field list expressions like EVAL
    AFTER_WITH_KEYWORD = 5,// After "WITH " but before opening brace: suggest opening braces with params
    WITHIN_MAP_EXPRESSION = 6,// After "WITH": suggest a json of params
    AFTER_COMMAND = 7
}
/**
 * Determines caret position in RERANK command
 */
export declare function getPosition(query: string, command: ESQLAstAllCommands): CaretPosition;
export declare function isAfterPotentialTargetFieldWithSpace(innerText: string): boolean;
