/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These ambient types are used to define default types for anything which is
 * supported in both server/browser environments.
 */

/**
 * peggy grammars are built automatically on import in both browser/server
 */
declare module '*.peggy' {
  export interface ParserOptions {
    [key: string]: any;
    /**
     * Object that will be attached to the each `LocationRange` object created by
     * the parser. For example, this can be path to the parsed file or even the
     * File object.
     */
    grammarSource?: any;
    startRule?: string;
    tracer?: ParserTracer;
  }

  /**
   * parse `input` using the peggy grammer
   * @param input code to parse
   * @param options parse options
   */
  export function parse(input: string, options?: ParserOptions): any;
}
