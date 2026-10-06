import { encodeUriQuery, encodeQuery, addQueryParam } from './encode_uri_query';
import { validateUrl } from './validate_url';
export declare const url: {
    encodeQuery: typeof encodeQuery;
    encodeUriQuery: typeof encodeUriQuery;
    addQueryParam: typeof addQueryParam;
    validate: typeof validateUrl;
};
