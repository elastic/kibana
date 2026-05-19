export interface HasParentApi<ParentApiType extends unknown = unknown> {
    parentApi: ParentApiType;
}
/**
 * A type guard which checks whether or not a given API has a parent API.
 */
export declare const apiHasParentApi: (unknownApi: null | unknown) => unknownApi is HasParentApi;
