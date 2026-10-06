import type { AddVersionOpts, RouteMethod } from '@kbn/core-http-server';
export type Method = Exclude<RouteMethod, 'options'>;
/** @internal */
export type Options = AddVersionOpts<unknown, unknown, unknown>;
/**
 * Specifies resolution strategy to use if a request does not provide a version.
 *
 * This strategy assumes that a handler is represented by a version string [0-9\-]+ that is
 * alphanumerically sortable.
 *
 * @internal
 */
export type HandlerResolutionStrategy = 
/** Use the oldest available version by default */
'oldest'
/** Use the newest available version by default */
 | 'newest'
/** Dev-only: remove resolution and fail if no version is provided */
 | 'none';
