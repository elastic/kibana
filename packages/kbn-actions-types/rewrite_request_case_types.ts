/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type RenameActionToConnector<K extends string> = K extends `actionTypeId`
  ? `connectorTypeId`
  : K extends `actionId`
  ? `connectorId`
  : K;

export type AsApiContract<T> = {
  [K in keyof T as CamelToSnake<RenameActionToConnector<Extract<K, string>>>]: K extends 'frequency'
    ? AsApiContract<T[K]>
    : T[K];
};

export type RewriteRequestCase<T> = (requested: AsApiContract<T>) => T;
export type RewriteResponseCase<T> = (
  responded: T
) => T extends Array<infer Item> ? Array<AsApiContract<Item>> : AsApiContract<T>;

/**
 * This type maps Camel Case strings into their Snake Case version.
 * This is achieved by checking each character and, if it is an uppercase character, it is mapped to an
 * underscore followed by a lowercase one.
 *
 * The reason there are two ternaries is that, for perfformance reasons, TS limits its
 * character parsing to ~15 characters.
 * To get around this we use the second turnery to parse 2 characters at a time, which allows us to support
 * strings that are 30 characters long.
 *
 * If you get the TS #2589 error ("Type instantiation is excessively deep and possibly infinite") then most
 * likely you have a string that's longer than 30 characters.
 * Address this by reducing the length if possible, otherwise, you'll need to add a 3rd ternary which
 * parses 3 chars at a time :grimace:
 *
 * For more details see this PR comment: https://github.com/microsoft/TypeScript/pull/40336#issuecomment-686723087
 */
type CamelToSnake<T extends string> = string extends T
  ? string
  : T extends `${infer C0}${infer C1}${infer R}`
  ? `${C0 extends Uppercase<C0> ? '_' : ''}${Lowercase<C0>}${C1 extends Uppercase<C1>
      ? '_'
      : ''}${Lowercase<C1>}${CamelToSnake<R>}`
  : T extends `${infer C0}${infer R}`
  ? `${C0 extends Uppercase<C0> ? '_' : ''}${Lowercase<C0>}${CamelToSnake<R>}`
  : '';
