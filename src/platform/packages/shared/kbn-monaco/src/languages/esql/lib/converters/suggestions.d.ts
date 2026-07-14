import type { ISuggestionItem } from '@kbn/esql-language/src/commands/registry/types';
import { monaco } from '../../../../monaco_imports';
export declare function wrapAsMonacoSuggestions(suggestions: ISuggestionItem[], fullText: string, defineRange?: boolean, escapeSpecialChars?: boolean, replaceParamsWithDefaults?: boolean): monaco.languages.CompletionList;
