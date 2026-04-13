import type { RouteValidator, RouteValidatorFullConfigRequest, RouteValidatorFullConfigResponse, RouteValidatorRequestAndResponses } from './route_validator';
type AnyRouteValidator = RouteValidator<unknown, unknown, unknown>;
/**
 * {@link RouteValidator} is a union type of all possible ways that validation
 * configuration can be registered. This helper utility narrows down the type
 * by indicating whether it is {@link RouteValidatorRequestAndResponses} or not.
 * @public
 */
export declare function isFullValidatorContainer(value: AnyRouteValidator): value is RouteValidatorRequestAndResponses<unknown, unknown, unknown>;
/**
 * Extracts {@link RouteValidatorFullConfigRequest} from the validation container.
 * This utility is intended to be used by code introspecting router validation configuration.
 * @public
 */
export declare function getRequestValidation<P, Q, B>(value: RouteValidator<P, Q, B> | (() => RouteValidator<P, Q, B>)): RouteValidatorFullConfigRequest<P, Q, B>;
/**
 * Extracts {@link RouteValidatorFullConfigRequest} from the validation container.
 * This utility is intended to be used by code introspecting router validation configuration.
 * @public
 */
export declare function getResponseValidation(value: RouteValidator<unknown, unknown, unknown> | (() => RouteValidator<unknown, unknown, unknown>)): undefined | RouteValidatorFullConfigResponse;
export {};
