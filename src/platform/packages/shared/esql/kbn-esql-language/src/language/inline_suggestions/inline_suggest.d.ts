import type { ESQLCallbacks } from '@kbn/esql-types';
import type { InlineSuggestionItem } from './types';
export declare function inlineSuggest(fullText: string, textBeforeCursor: string, range: InlineSuggestionItem['range'], callbacks?: ESQLCallbacks): Promise<{
    items: InlineSuggestionItem[];
}>;
