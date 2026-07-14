declare const __spaceIdBrand: unique symbol;
/**
 * A branded string type for Kibana space identifiers.
 *
 * Use {@link asSpaceId} to create a `SpaceId` from an untrusted string
 * (validates the format), or {@link DEFAULT_SPACE_ID} for the built-in
 * default space.
 */
export type SpaceId = string & {
    readonly [__spaceIdBrand]: never;
};
/**
 * Validates and brands a plain string as a {@link SpaceId}.
 *
 * @throws if `value` does not match `/^[a-z0-9_-]+$/`
 */
export declare const asSpaceId: (value: string) => SpaceId;
/**
 * The identifier of the built-in default Kibana space.
 */
export declare const DEFAULT_SPACE_ID: SpaceId;
/**
 * Returns the URL path prefix for the given space (`/s/<spaceId>`),
 * or an empty string for the default space.
 */
export declare const getSpaceUrlPrefix: (spaceId: SpaceId) => string;
export {};
