import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ISuggestionItem, ICommandContext, ICommandCallbacks } from '../types';
export declare function autocomplete(query: string, command: ESQLAstAllCommands, callbacks?: ICommandCallbacks, context?: ICommandContext, cursorPosition?: number): Promise<ISuggestionItem[]>;
