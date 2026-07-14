import type { ESQLAstAllCommands } from '@elastic/esql/types';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../../definitions/constants';
import type { ICommandCallbacks } from '../types';
import { type ICommandContext, type ISuggestionItem } from '../types';
export declare const FUNCTIONS_TO_IGNORE: {
    names: string[];
    allowedInsideFunctions: Record<(typeof FULL_TEXT_SEARCH_FUNCTIONS)[number], string[]>;
};
export declare function autocomplete(query: string, command: ESQLAstAllCommands, callbacks?: ICommandCallbacks, context?: ICommandContext, cursorPosition?: number): Promise<ISuggestionItem[]>;
