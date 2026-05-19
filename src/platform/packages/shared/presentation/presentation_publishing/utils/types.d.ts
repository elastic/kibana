/**
 * A type that converts a single key from snake case to camel case.
 */
export type SnakeToCamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}` ? `${P1}${Uppercase<P2>}${SnakeToCamelCase<P3>}` : S;
/**
 * A type that converts a single key from camel case to snake case.
 */
export type CamelToSnakeCase<S extends string> = S extends `${infer C}${infer R}` ? `${C extends Lowercase<C> ? '' : '_'}${Lowercase<C>}${CamelToSnakeCase<R>}` : S;
/**
 * A type that recursively converts all keys in an object from camel case to snake case.
 */
export type SnakeCasedKeys<StateType extends object = object> = {
    [KeyType in keyof StateType as `${CamelToSnakeCase<string & KeyType>}`]: StateType[KeyType] extends object ? StateType[KeyType] extends Array<any> ? StateType[KeyType] : SnakeCasedKeys<StateType[KeyType]> : StateType[KeyType];
};
