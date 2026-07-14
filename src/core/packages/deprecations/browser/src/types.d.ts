/**
 * Response from correctiveActions.api call from automatically resolving the deprecation
 * @public
 */
export type ResolveDeprecationResponse = {
    status: 'ok';
} | {
    status: 'fail';
    reason: string;
};
