/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type IParsedUrlQuery = Record<string, any>;
interface IUrlQueryMapperOptions {
  hashableParams: string[];
}
export type IUrlQueryReplacerOptions = IUrlQueryMapperOptions;
export declare const unhashQuery: (
  query: IParsedUrlQuery,
  options?: IUrlQueryMapperOptions
) => {
  [k: string]: any;
};
export declare const hashQuery: (
  query: IParsedUrlQuery,
  options?: IUrlQueryMapperOptions
) => {
  [k: string]: any;
};
export declare const unhashUrl: (url: string) => string;
export declare const hashUrl: (url: string) => string;
export {};
