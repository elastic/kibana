import type { QuerySuggestion } from '../../autocomplete';
export type SuggestionOnClick = (suggestion: QuerySuggestion, index: number) => void;
export type SuggestionOnMouseEnter = (suggestion: QuerySuggestion, index: number) => void;
