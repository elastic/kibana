import { monaco } from '../../../../monaco_imports';
import type { ESQLDependencies } from './types';
export declare const ESQL_AUTOCOMPLETE_TRIGGER_CHARS: string[];
export declare function getSuggestionProvider(deps?: ESQLDependencies): monaco.languages.CompletionItemProvider;
