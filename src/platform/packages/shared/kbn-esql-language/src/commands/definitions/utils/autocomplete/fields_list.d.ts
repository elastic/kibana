import type { ESQLAstAllCommands, ESQLAstField } from '@elastic/esql/types';
import { type ICommandCallbacks, type ICommandContext, type ISuggestionItem, type Location } from '../../../registry/types';
import type { ExpressionContextOptions } from './expressions/types';
export declare function suggestFieldsList(query: string, command: ESQLAstAllCommands, fieldList: ESQLAstField[], location: Location, callbacks?: ICommandCallbacks, context?: ICommandContext, cursorPosition?: number, options?: {
    /** Listed functions will not be suggested in expressions */
    functionsToIgnore?: ExpressionContextOptions['functionsToIgnore'];
    /** Suggestions to show after a complete field expression */
    afterCompleteSuggestions?: ISuggestionItem[];
    /** Include pipe/comma suggestions after a complete field expression */
    includePipeAndCommaSuggestions?: boolean;
    /** If true, consideres a single column as a completed field expression */
    allowSingleColumnFields?: boolean;
    /** the preferred field type */
    preferredExpressionType?: ExpressionContextOptions['preferredExpressionType'];
    /** Columns to exclude from suggestions (e.g. already used in BY clause) */
    ignoredColumnsForEmptyExpression?: string[];
    /** If true, disables col0 and assignment suggestions (for contexts where assignments are not supported) */
    disableNewColumnSuggestion?: boolean;
}): Promise<ISuggestionItem[]>;
