/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (group: string, name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const BASIC = 'Basic command structure';
const WITH_CLAUSE = 'WITH clause functionality';

const QUERY_LITERAL = '"${0:The text to highlight}"';
const PREFIX_MODIFIER = 'prefix = "${0:highlight_}"';
const FULL_TEXT_FUNCTIONS = ['KQL("""$0""")', 'MATCH($0)', 'MATCH_PHRASE($0)', 'QSTR("""$0""")'];
const WITH = 'WITH { $0 }';
const END_OF_COMMAND = ['\n', '| '];
const AFTER_QUERY = ['ON ', WITH, ...END_OF_COMMAND];
const ON = 'from a | highlight "search query" on ';

const stringColumns = columns({ types: ['keyword', 'text'], followedBySpace: true });

const PARAMETER_KEYS = [
  '"analyzer": "$0"',
  '"boundary_scanner": "$0"',
  '"boundary_scanner_locale": "$0"',
  '"encoder": "$0"',
  '"fragment_size": ',
  '"max_analyzed_offset": ',
  '"no_match_size": ',
  '"number_of_fragments": ',
  '"order": "$0"',
  '"post_tags": "$0"',
  '"pre_tags": "$0"',
];

export const highlightScenarios: ScenarioTable = {
  command: 'highlight',
  scenarios: [
    ...rows(
      BASIC,
      'suggests the query snippet, the prefix modifier, full-text functions, ON, WITH and the end of the command, but no bare fields, after HIGHLIGHT',
      ['from a | highlight '],
      [QUERY_LITERAL, PREFIX_MODIFIER, ...FULL_TEXT_FUNCTIONS, ...AFTER_QUERY]
    ),
    ...rows(
      BASIC,
      'suggests the same without the prefix modifier, and no bare fields, after a prefix',
      ['from a | highlight prefix = "hl_" '],
      [QUERY_LITERAL, ...FULL_TEXT_FUNCTIONS, ...AFTER_QUERY]
    ),
    {
      group: BASIC,
      name: 'suggests fields, but not the query snippet, ON or the end of the command, inside a full-text function argument',
      query: 'from a | highlight MATCH(',
      expect: {
        contains: ['textField, ', 'keywordField, '],
        excludes: [QUERY_LITERAL, 'ON ', WITH, '| '],
      },
    },
    {
      group: BASIC,
      name: 'does not suggest the prefix modifier once a query expression is started',
      query: 'from a | highlight "fo',
      expect: { excludes: [PREFIX_MODIFIER] },
    },
    ...rows(
      BASIC,
      'suggests ON, WITH and the end of the command after a complete query',
      ['from a | highlight "search query" ', 'from a | highlight MATCH(textField, "ring") '],
      AFTER_QUERY
    ),
    ...rows(
      BASIC,
      'suggests a lone * and text and keyword fields, but no new column, after ON',
      ['from a | highlight "search query" ON ', 'from a | highlight ON '],
      ['*', ...stringColumns]
    ),
    ...rows(
      BASIC,
      'suggests field continuations after a complete field',
      [`${ON}keywordField`],
      [WITH, ', ', ...END_OF_COMMAND, '*', ...stringColumns]
    ),
    ...rows(
      BASIC,
      'suggests more fields, but no *, after a comma in the ON list',
      [`${ON}textField, `, `${ON}textField,`, `${ON}textField,key`],
      stringColumns
    ),
    ...rows(
      BASIC,
      'only suggests WITH or the end of the command after *',
      [`${ON}* `],
      [WITH, ...END_OF_COMMAND]
    ),

    ...rows(
      'Prefix modifier',
      'suggests a quoted string value after prefix =',
      ['from a | highlight prefix = '],
      ['"${0:highlight_}"']
    ),

    ...rows(
      WITH_CLAUSE,
      'suggests opening braces when WITH is already typed',
      [`${ON}textField WITH `],
      ['{ $0 }']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests parameter keys inside an empty WITH map',
      [`${ON}textField with { `],
      PARAMETER_KEYS
    ),
    ...rows(
      WITH_CLAUSE,
      'does not suggest already-used parameter keys after a comma',
      [`${ON}textField with { "encoder": "html", `],
      PARAMETER_KEYS.filter((key) => key !== '"encoder": "$0"')
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests predefined values for the encoder parameter',
      [`${ON}textField with { "encoder": "`],
      ['"default"', '"html"']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests predefined values for the order parameter',
      [`${ON}textField with { "order": "`],
      ['"none"', '"score"']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests only pipe and newline after a complete WITH map',
      [`${ON}textField with { "encoder": "html" } `],
      END_OF_COMMAND
    ),
    ...rows(
      WITH_CLAUSE,
      'does not suggest unsupported parameter values',
      [`${ON}textField with { "unsupported_param": "`],
      []
    ),
  ],
};
