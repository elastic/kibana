import type { ISuggestionItem } from '../../registry/types';
export declare const buildValueDefinitions: (values: string[], options?: {
    advanceCursorAndOpenSuggestions?: boolean;
    addComma?: boolean;
}) => ISuggestionItem[];
