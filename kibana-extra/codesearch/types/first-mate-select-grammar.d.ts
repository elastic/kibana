/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'first-mate-select-grammar' {
  import GrammarRegistry, { Grammar } from 'first-mate';

  interface GammarSelector {
    selectGrammar(
      registry: GrammarRegistry,
      filePath?: string,
      fileContents?: string
    ): Grammar | undefined;
  }

  export default function(): GammarSelector;
}
