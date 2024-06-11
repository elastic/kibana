/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @internal **/
type CallbackFn<Options = {}, Result = string> = (ctx?: Options) => Result[] | Promise<Result[]>;

/** @public **/
export interface ESQLCallbacks {
  getSources?: CallbackFn<{}, { name: string; hidden: boolean }>;
  getFieldsFor?: CallbackFn<{ query: string }, { name: string; type: string }>;
  getPolicies?: CallbackFn<
    {},
    { name: string; sourceIndices: string[]; matchField: string; enrichFields: string[] }
  >;
}

export type ReasonTypes = 'missingCommand' | 'unsupportedFunction' | 'unknownFunction';
