import type { ESQLAstAllCommands } from '@elastic/esql/types';
import { type ISuggestionItem, type ICommandContext, type ICommandCallbacks } from '../types';
export declare enum CompletionPosition {
    AFTER_COMPLETION = "after_completion",
    AFTER_TARGET_FIELD = "after_target_field",// After 'col0 ' (non-existing column), suggest '='
    AFTER_TARGET_ASSIGNMENT = "after_target_assignment",// After 'col0 =', suggest prompt
    EXPRESSION = "expression",
    AFTER_WITH_KEYWORD = "after_with_keyword",
    WITHIN_MAP_EXPRESSION = "within_map_expression",
    AFTER_COMMAND = "after_command"
}
export declare function autocomplete(query: string, command: ESQLAstAllCommands, callbacks?: ICommandCallbacks, context?: ICommandContext, cursorPosition?: number): Promise<ISuggestionItem[]>;
