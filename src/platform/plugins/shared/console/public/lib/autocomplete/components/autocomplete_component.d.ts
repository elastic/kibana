import type { ResultTerm } from '../types';
export type AutocompleteTermDefinition = string | ResultTerm;
export interface AutocompleteMatchResult {
    context_values?: Record<string, unknown>;
    next?: AutocompleteComponent | AutocompleteComponent[];
    priority?: number;
}
export type AutocompleteMatch = AutocompleteMatchResult | null | false | undefined;
export declare class AutocompleteComponent {
    name: string;
    next?: AutocompleteComponent[];
    constructor(name: string);
    /** called to get the possible suggestions for tokens, when this object is at the end of
     * the resolving chain (and thus can suggest possible continuation paths)
     */
    getTerms(_context?: unknown, _editor?: unknown): AutocompleteTermDefinition[] | null | undefined;
    match(_token?: unknown, _context?: unknown, _editor?: unknown): AutocompleteMatch;
}
