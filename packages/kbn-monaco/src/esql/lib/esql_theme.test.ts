/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

    for (const rule of theme.rules) {
      expect([...lexicalNames, ...syntheticNames]).toContain(
        rule.token.replace(ESQL_TOKEN_POSTFIX, '').toLowerCase()
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

      // Lexer-mode-specific stuff
      'explain_line_comment',
      'explain_multiline_comment',
      'explain_ws',
      'project_line_comment',
      'project_multiline_comment',
      'project_ws',
      'rename_line_comment',
      'rename_multiline_comment',
      'rename_ws',
      'from_line_comment',
      'from_multiline_comment',
      'from_ws',
      'enrich_line_comment',
      'enrich_multiline_comment',
      'enrich_ws',
      'mvexpand_line_comment',
      'mvexpand_multiline_comment',
      'mvexpand_ws',
      'enrich_field_line_comment',
      'enrich_field_multiline_comment',
      'enrich_field_ws',
      'lookup_line_comment',
      'lookup_multiline_comment',
      'lookup_ws',
      'lookup_field_line_comment',
      'lookup_field_multiline_comment',
      'lookup_field_ws',
      'show_line_comment',
      'show_multiline_comment',
      'show_ws',
      'meta_line_comment',
      'meta_multiline_comment',
      'meta_ws',
      'setting',
      'setting_line_comment',
      'settting_multiline_comment',
      'setting_ws',
      'metrics_line_comment',
      'metrics_multiline_comment',
      'metrics_ws',
      'closing_metrics_line_comment',
      'closing_metrics_multiline_comment',
      'closing_metrics_ws',
    ];

    // First, check that every valid exception is actually valid
    for (const name of validExceptions) {
      expect(lexicalNames).toContain(name);
    }

    const namesToCheck = lexicalNames.filter((name) => !validExceptions.includes(name));

    // Now, check that every lexical name has a corresponding rule
    for (const name of namesToCheck) {
      expect(tokenIDs).toContain(name);
    }
  });
});
