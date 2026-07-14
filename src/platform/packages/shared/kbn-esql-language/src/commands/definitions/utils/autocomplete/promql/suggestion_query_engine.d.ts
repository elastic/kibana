import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ICommandContext, ISuggestionItem } from '../../../../registry/types';
interface SuggestForPromqlQueryInput {
    columns: ICommandContext['columns'] | undefined;
    shouldWrap: boolean;
    queryText?: string;
    cursorRelative?: number;
    variables?: ESQLControlVariable[];
    supportsControls?: boolean;
}
export declare function suggestForPromqlQuery(input: SuggestForPromqlQueryInput): ISuggestionItem[];
export {};
