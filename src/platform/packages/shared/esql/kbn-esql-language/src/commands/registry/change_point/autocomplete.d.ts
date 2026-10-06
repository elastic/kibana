import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ISuggestionItem, ICommandCallbacks, ICommandContext } from '../types';
export declare enum Position {
    VALUE = "value",
    AFTER_VALUE = "after_value",
    ON_COLUMN = "on_column",
    AFTER_ON_CLAUSE = "after_on_clause",
    AS_TYPE_COLUMN = "as_type_clause",
    AS_P_VALUE_COLUMN = "as_p_value_column",
    AFTER_AS_CLAUSE = "after_as_clause",
    BY_CLAUSE = "by_clause"
}
export declare const getPosition: (query: string, command: ESQLAstAllCommands) => Position | undefined;
export declare function autocomplete(query: string, command: ESQLAstAllCommands, callbacks?: ICommandCallbacks, context?: ICommandContext, cursorPosition?: number): Promise<ISuggestionItem[]>;
