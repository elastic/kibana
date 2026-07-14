import type { RouteValidationFunction } from '@kbn/core-http-server';
interface ZodSafeParseable<Output = any> {
    safeParse(data: unknown): {
        success: true;
        data: Output;
    } | {
        success: false;
        error: {
            issues: unknown[];
        };
    };
}
/**
 * Zod validation factory for Kibana route's request validation.
 * It allows to pass a Zod schema for parameters, query and/or body validation.
 *
 * Example:
 *
 * ```ts
 * router.versioned
 *   .post({
 *     access: 'public',
 *     path: MY_URL,
 *   })
 *   .addVersion(
 *     {
 *       version: 'my-version',
 *       validate: {
 *         request: {
 *           params: buildRouteValidationWithZod(MyRequestParamsZodSchema),
 *           query: buildRouteValidationWithZod(MyRequestQueryZodSchema),
 *           body: buildRouteValidationWithZod(MyRequestBodyZodSchema),
 *         },
 *       },
 *     },
 * ```
 */
export declare function buildRouteValidationWithZod<Output>(schema: ZodSafeParseable<Output>): RouteValidationFunction<Output>;
export {};
