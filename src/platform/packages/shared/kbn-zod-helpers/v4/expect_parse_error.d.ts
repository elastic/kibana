import type { ZodSafeParseError, ZodSafeParseResult } from '@kbn/zod/v4';
export declare function expectParseError<Output>(result: ZodSafeParseResult<Output>): asserts result is ZodSafeParseError<Output>;
