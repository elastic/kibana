import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../types';
export declare function autocomplete(query: string, command: ESQLAstAllCommands, callbacks?: ICommandCallbacks, context?: ICommandContext, cursorPosition?: number): Promise<ISuggestionItem[]>;
