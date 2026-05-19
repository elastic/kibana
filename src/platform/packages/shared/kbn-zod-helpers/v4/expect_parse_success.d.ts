import type { ZodSafeParseResult, ZodSafeParseSuccess } from '@kbn/zod/v4';
export declare function expectParseSuccess<Output>(result: ZodSafeParseResult<Output>): asserts result is ZodSafeParseSuccess<Output>;
