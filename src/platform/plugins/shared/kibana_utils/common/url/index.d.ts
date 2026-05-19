import { encodeUriQuery } from './encode_uri_query';
import { validateUrl } from './validate_url';
export declare const url: {
    encodeQuery: (query: import("query-string").ParsedQuery, encodeFunction?: (val: string, pctEncodeSpaces?: boolean) => string, pctEncodeSpaces?: boolean) => import("query-string").ParsedQuery;
    encodeUriQuery: typeof encodeUriQuery;
    addQueryParam: (params: string, key: string, value?: string) => string;
    validate: typeof validateUrl;
};
