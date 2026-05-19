import type * as Either from 'fp-ts/Either';
import type { RetryableEsClientError } from '../actions';
export type ExcludeRetryableEsError<Response> = Exclude<Exclude<Response, Either.Either<Response extends Either.Left<unknown> ? Response['left'] : never, never>> | Either.Either<Exclude<Response extends Either.Left<unknown> ? Response['left'] : never, RetryableEsClientError>, Response extends Either.Right<unknown> ? Response['right'] : never>, Either.Left<never>>;
