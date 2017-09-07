import * as schemaLib from '../lib/schema';

export type Schema = typeof schemaLib;

// TODO
// This _can't_ be part of the types, as it has to be available at runtime.
// It was the only way I was able to grab the return type of `createSchema` in
// the configs in a good way for the constructor. Relevant TS issues to solve
// this at the type level:
// https://github.com/Microsoft/TypeScript/issues/6606
// https://github.com/Microsoft/TypeScript/issues/14400
export function typeOfSchema<RT extends schemaLib.Any>(
  fn: (...rest: any[]) => RT
): schemaLib.TypeOf<RT> {
  return undefined;
}
