import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../../../registry/types';
export declare function getIndicesBrowserSuggestion({ callbacks, context, }: {
    callbacks?: ICommandCallbacks;
    context?: ICommandContext;
}): Promise<ISuggestionItem | undefined>;
export declare function shouldSuggestIndicesBrowserAfterComma(commandText: string): boolean;
