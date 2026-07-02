import type { Either } from 'fp-ts/Either';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as t from 'io-ts';
export declare const validate: <T extends t.Mixed>(obj: object, schema: T) => [t.TypeOf<T>, null] | [null, string];
export declare const validateNonExact: <T extends t.Mixed>(obj: unknown, schema: T) => [t.TypeOf<T>, null] | [null, string];
export declare const validateEither: <T extends t.Mixed, A extends unknown>(schema: T, obj: A) => Either<Error, A>;
export declare const validateTaskEither: <T extends t.Mixed, A extends unknown>(schema: T, obj: A) => TaskEither<Error, A>;
