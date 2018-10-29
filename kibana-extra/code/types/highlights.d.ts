/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'highlights' {
  import GrammarRegistry from 'first-mate';

  export default class Highlights {
    public registry: GrammarRegistry;

    constructor(params?: {
      includePath?: string;
      registry?: GrammarRegistry;
      scopePrefix?: string;
    });

    public loadGrammarsSync(): void;
    public loadGrammars(cb: (err?: Error) => void): void;
    public escapeString(s: string): string;
  }
}
