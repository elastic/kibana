/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

/**
 * .text files are compiled into CommonJS, exporting a string by default
 */
declare module '*.text' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

/**
 * YAML files are loaded as raw strings via asset/source in webpack,
 * the yaml transform in kbn-babel-register for Node runtime,
 * and the raw transform in Jest.
 */
declare module '*.yaml' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

declare module '*.yml' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

/**
 * Redux Toolkit v2 migration: type declarations for v1 compat alias internal deps.
 *
 * redux-toolkit-v1 (npm alias for @reduxjs/toolkit@1.9.7) has its dependencies
 * (reselect@4, immer@9) nested under redux-toolkit-v1/node_modules/ because the
 * top-level versions are now v5/v10. TypeScript considers these nested paths
 * non-portable (TS2742), so we declare them here to map the types to the
 * top-level v1 alias packages.
 */
declare module 'redux-toolkit-v1/node_modules/reselect' {
  export * from 'reselect-v4';
}

declare module 'redux-toolkit-v1/node_modules/immer/dist/internal' {
  export * from 'immer-v9/dist/internal';
}
