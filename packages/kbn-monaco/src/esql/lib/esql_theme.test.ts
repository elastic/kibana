/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLErrorListener, getLexer as _getLexer } from '@kbn/esql-ast';
import { ESQL_TOKEN_POSTFIX } from './constants';
import { buildESQlTheme } from './esql_theme';
import { CharStreams } from 'antlr4';

describe('ESQL Theme', () => {
  it('should not have multiple rules for a single token', () => {
    const theme = buildESQlTheme();

    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const rule of theme.rules) {
      if (seen.has(rule.token)) {
        duplicates.push(rule.token);
      }
      seen.add(rule.token);
    }

    expect(duplicates).toEqual([]);
  });

  const getLexer = () => {
    const errorListener = new ESQLErrorListener();
    const inputStream = CharStreams.fromString('FROM foo');
    return _getLexer(inputStream, errorListener);
  };

  const lexer = getLexer();
  const lexicalNames = lexer.symbolicNames
    .filter((name) => typeof name === 'string')
    .map((name) => name!.toLowerCase());

  it('every rule should apply to a valid lexical name', () => {
    const theme = buildESQlTheme();

    // These names aren't from the lexer... they are added on our side
    // see packages/kbn-monaco/src/esql/lib/esql_token_helpers.ts
    const syntheticNames = ['functions', 'nulls_order', 'timespan_literal'];

    const rulesWithNoName: string[] = [];
    for (const rule of theme.rules) {
      const token = rule.token.replace(ESQL_TOKEN_POSTFIX, '');
      if (![...lexicalNames, ...syntheticNames].includes(token)) {
        rulesWithNoName.push(token);
      }
    }

    if (rulesWithNoName.length) {
      throw new Error(
        `These rules have no corresponding lexical name: ${rulesWithNoName.join(', ')}`
      );
    }
  });

  it('every valid lexical name should have a corresponding rule', () => {
    const theme = buildESQlTheme();
    const tokenIDs = theme.rules.map((rule) => rule.token.replace(ESQL_TOKEN_POSTFIX, ''));

    const validExceptions = [
      'unquoted_source',
      'false', // @TODO consider if this should get styling
      'true', // @TODO consider if this should get styling
      'info', // @TODO consider if this should get styling
      'colon', // @TODO consider if this should get styling

      'nulls', // nulls is a part of nulls_order so it doesn't need its own rule
      'first', // first is a part of nulls_order so it doesn't need its own rule
      'last', // last is a part of nulls_order so it doesn't need its own rule

      'id_pattern', // "KEEP <id_pattern>, <id_pattern>"... no styling needed
      'enrich_policy_name', // "ENRICH <enrich_policy_name>"
      'expr_ws', // whitespace, so no reason to style it
      'unknown_cmd', // unknown command, so no reason to style it

      'explain_ws',
      'project_ws',
      'rename_ws',
      'from_ws',
      'enrich_ws',
      'mvexpand_ws',
      'enrich_field_ws',
      'lookup_ws',
      'lookup_field_ws',
      'show_ws',
      'meta_ws',
      'setting',
      'setting_ws',
      'metrics_ws',
      'closing_metrics_ws',
    ];

    // First, check that every valid exception is actually valid
    const invalidExceptions: string[] = [];
    for (const name of validExceptions) {
      if (!lexicalNames.includes(name)) {
        invalidExceptions.push(name);
      }
    }

    if (invalidExceptions.length) {
      throw new Error(
        `These rule requirement exceptions are not valid lexical names: ${invalidExceptions.join(
          ', '
        )}`
      );
    }

    const namesToCheck = lexicalNames.filter((name) => !validExceptions.includes(name));

    // Now, check that every lexical name has a corresponding rule
    const missingRules: string[] = [];
    for (const name of namesToCheck) {
      if (!tokenIDs.includes(name)) {
        missingRules.push(name);
      }
    }

    if (missingRules.length) {
      throw new Error(
        `These lexical names are missing corresponding rules: ${missingRules.join(', ')}`
      );
    }
  });
});
