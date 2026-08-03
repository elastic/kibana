import type { SnakeCasedKeys } from './types';
/**
 * This function takes an object and recursively converts all of the keys to `snaked_cased`
 * @param input The object with `camelCased` keys
 * @returns The object with `snake_cased` keys
 */
export declare const convertCamelCasedKeysToSnakeCase: <StateType extends object = object>(input: StateType) => SnakeCasedKeys<StateType>;
