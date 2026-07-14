import type { AddVersionOpts, RouteValidationSpec, VersionedRouteCustomResponseBodyValidation, VersionedResponseBodyValidation } from '@kbn/core-http-server';
export declare function isCustomValidation(v: VersionedRouteCustomResponseBodyValidation | VersionedResponseBodyValidation): v is VersionedRouteCustomResponseBodyValidation;
/**
 * Utility for unwrapping versioned router response validation to
 * {@link RouteValidationSpec}.
 *
 * @param validation - versioned response body validation
 * @internal
 */
export declare function unwrapVersionedResponseBodyValidation(validation: VersionedResponseBodyValidation): RouteValidationSpec<unknown>;
export declare function prepareVersionedRouteValidation(options: AddVersionOpts<unknown, unknown, unknown>): AddVersionOpts<unknown, unknown, unknown>;
