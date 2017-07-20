// TODO Strictly speaking it would be great to not include this function in
// the types package. However, it is needed because of how we inject `schema`
// into configs, so we don't have to specify the full type in the config
// constructors.
// Relevant TS issues for solving this at the type level:
// https://github.com/Microsoft/TypeScript/issues/6606
// https://github.com/Microsoft/TypeScript/issues/14400
export function typeOfSchema() {
  return undefined;
}
