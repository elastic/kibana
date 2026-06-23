import type { ESQLSourceResult, IndexAutocompleteItem } from '@kbn/esql-types';
interface ResourceBrowserCommandArgsParams {
    sources?: ESQLSourceResult[];
    timeSeriesSources?: IndexAutocompleteItem[];
}
export declare const buildResourceBrowserCommandArgs: ({ sources, timeSeriesSources, }: ResourceBrowserCommandArgsParams) => Record<string, string> | undefined;
export interface PreloadedFieldItem {
    name: string;
    type?: string;
}
interface FieldsBrowserCommandArgsParams {
    /** Suggested fields (name + optional type) used to preload the fields browser list. */
    fields?: PreloadedFieldItem[];
}
/**
 * Builds the (optional) command payload for the "Browse fields" autocomplete item.
 *
 * The payload is a JSON-encoded list of suggested fields (name and type) used to preload the
 * fields browser list. This is not a pre-selection — the fields browser always opens with
 * no selected field.
 */
export declare const buildFieldsBrowserCommandArgs: ({ fields, }: FieldsBrowserCommandArgsParams) => Record<string, string> | undefined;
export {};
