/**
 * `@hapi/hapi` 21.4.10 widened the default query, params, and headers refs to
 * `unknown` so applications can augment them. Kibana keeps hapi's default query
 * parser and does not coerce path params or headers, so restore the previous types.
 *
 * Duplicated in `@kbn/core-http-server` because these packages cannot depend on
 * each other. Keep the two augmentations identical.
 */
declare module '@hapi/hapi' {
    interface ReqRefDefaults {
        Query: {
            [key: string]: string | string[] | undefined;
        };
        Params: Record<string, string>;
        Headers: Record<string, string | string[] | undefined>;
    }
}
export {};
