/** Parsed URL params after `query-string` parsing. */
export type ParsedQuery = Record<string, string | string[] | null | undefined>;
export interface UrlStateSlices {
    queryText?: string;
    sort?: {
        field: string;
        direction: 'asc' | 'desc';
    };
}
export interface HydratedUrlState {
    kind: 'new' | 'legacy' | 'empty';
    state: UrlStateSlices;
    consumed?: ReadonlyArray<string>;
}
