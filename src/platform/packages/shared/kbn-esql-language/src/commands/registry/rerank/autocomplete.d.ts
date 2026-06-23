import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../types';
export declare const QUERY_TEXT: "Your search query";
export declare const QUERY_TEXT_SNIPPET: string;
export declare function autocomplete(query: string, command: ESQLAstAllCommands, callbacks?: ICommandCallbacks, context?: ICommandContext, cursorPosition?: number): Promise<ISuggestionItem[]>;
