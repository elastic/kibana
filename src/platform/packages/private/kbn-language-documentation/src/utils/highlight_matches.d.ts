export declare const HIGHLIGHT_TOKEN = "=hl=";
/**
 * Highlights text matches in a string by wrapping them in a highlighted mardown =hl=text=hl=.
 * Performs case-insensitive matching while avoiding highlighting text inside
 * markdown code blocks and links.
 */
export declare function highlightMatches(text: string, searchText: string): string;
export declare function removeHighlighting(text: string): string;
