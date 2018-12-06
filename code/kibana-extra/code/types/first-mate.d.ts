/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'first-mate' {
  interface Token {
    value: string;
    scopes: string[];
  }

  export interface Grammar {
    registry: GrammarRegistry;
    tokenizeLines(text: string, compatibilityMode?: boolean): Token[][];
  }

  export default class GrammarRegistry {}
}
