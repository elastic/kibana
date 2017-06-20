// Can be used in switch statements to ensure we perform exhaustive checks, see
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#exhaustiveness-checking
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}
