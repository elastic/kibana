/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  esqlCommandRegistry,
  TIME_SYSTEM_PARAMS,
  timeUnitsToSuggest,
  withAutoSuggest,
  METADATA_FIELDS,
  ESQL_STRING_TYPES,
} from '../../..';
import { getSafeInsertText } from '../../commands/definitions/utils';
import { scalarFunctionDefinitions } from '../../commands/definitions/generated/scalar_functions';
import { getDateHistogramCompletionItem } from '../../commands/registry/complete_items';
import { getRecommendedQueriesTemplates } from '../../commands/registry/options/recommended_queries';
import type { ISuggestionItem } from '../../commands/registry/types';
import { Location } from '../../commands/registry/types';
import type { PartialSuggestionWithText, SuggestOptions } from './__tests__/helpers';
import {
  attachParameterHelperCommand,
  attachTriggerCommand,
  createCustomCallbackMocks,
  fields,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  getPolicyFields,
  policies,
  setup,
  TIME_PICKER_SUGGESTION,
} from './__tests__/helpers';
import { suggest } from './autocomplete';
import { editorExtensions } from '../../__tests__/language/helpers';
import { mapRecommendedQueriesFromExtensions } from './recommended_queries_helpers';

const getRecommendedQueriesSuggestionsFromTemplates = (
  fromCommand: string,
  timeField?: string,
  categorizationField?: string
) =>
  getRecommendedQueriesTemplates({
    fromCommand,
    timeField,
    categorizationField,
  });

describe('autocomplete', () => {
  type TestArgs = [
    string,
    Array<string | PartialSuggestionWithText>,
    string?,
    Parameters<typeof createCustomCallbackMocks>?
  ];

  const _testSuggestionsFn = (
    { only, skip }: { only?: boolean; skip?: boolean } = {},
    statement: string,
    expected: Array<string | PartialSuggestionWithText>,
    triggerCharacter?: string,
    customCallbacksArgs: Parameters<typeof createCustomCallbackMocks> = [
      undefined,
      undefined,
      undefined,
    ]
  ) => {
    const testFn = only ? test.only : skip ? test.skip : test;
    testFn(statement, async () => {
      const callbackMocks = createCustomCallbackMocks(...customCallbacksArgs);
      const { assertSuggestions } = await setup();
      await assertSuggestions(statement, expected, { callbacks: callbackMocks, triggerCharacter });
    });
  };

  // Enrich the function to work with .only and .skip as regular test function
  //
  // DO NOT CHANGE THE NAME OF THIS FUNCTION WITHOUT ALSO CHANGING
  // THE LINTER RULE IN packages/kbn-eslint-config/typescript.js
  //
  const testSuggestions = Object.assign(_testSuggestionsFn.bind(null, {}), {
    skip: (...args: TestArgs) => {
      return _testSuggestionsFn({ skip: true }, ...args);
    },
    only: (...args: TestArgs) => {
      return _testSuggestionsFn({ only: true }, ...args);
    },
  });

  const sourceCommands = esqlCommandRegistry.getSourceCommandNames();
  const headerCommands = esqlCommandRegistry
    .getAllCommands()
    .filter(({ metadata }) => metadata.type === 'header')
    .map(({ name }) => name);

  const getSourceAndHeaderCommands = () => {
    return [
      ...headerCommands.map((name) => name.toUpperCase() + ' '),
      ...sourceCommands.map((name) => name.toUpperCase() + ' '),
    ];
  };

  const getNonSourceHeaderCommands = () => {
    return esqlCommandRegistry
      ?.getAllCommands()
      .filter(
        ({ name, metadata }) =>
          !sourceCommands.includes(name) && !headerCommands.includes(name) && !metadata.hidden
      )
      .map(({ name, metadata }) => {
        if (metadata.types && metadata.types.length) {
          const cmds: string[] = [];
          for (const type of metadata.types) {
            const cmd = type.name.toUpperCase() + ' ' + name.toUpperCase() + ' ';
            cmds.push(cmd);
          }
          return cmds;
        } else {
          return name.toUpperCase() + ' ';
        }
      })
      .flat();
  };

  describe('New command', () => {
    const recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
      'FROM logs*',
      'dateField',
      'textField'
    );

    testSuggestions('/', [
      ...getSourceAndHeaderCommands(),
      ...mapRecommendedQueriesFromExtensions(editorExtensions.recommendedQueries),
      ...recommendedQuerySuggestions.map((q) => q.queryString),
    ]);
    const commands = getNonSourceHeaderCommands();

    testSuggestions('from a | /', commands);
    testSuggestions('from a metadata _id | /', commands);
    testSuggestions('from a | eval col0 = a | /', commands);
    testSuggestions('from a metadata _id | eval col0 = a | /', commands);

    const promqlPipedQueries = [
      'PROMQL index=metrics (sum by (instance) rate(http_requests_total[5m])) | /',
      'PROMQL index=metrics sum by (instance) rate(http_requests_total[5m]) | /',
      'PROMQL index=metrics (rate(http_requests_total[5m])) | /',
      'PROMQL rate(http_requests_total[5m]) | /',
      'PROMQL index=metrics col0=(rate(http_requests_total[5m])) | /',
    ];

    promqlPipedQueries.forEach((query) => {
      testSuggestions(query, commands);
    });
  });

  describe.each(['keep', 'drop'])('%s', (command) => {
    testSuggestions(`from a | ${command} /`, getFieldNamesByType('any'));
    testSuggestions(
      `from a | ${command} keywordField, /`,
      getFieldNamesByType('any').filter((name) => name !== 'keywordField')
    );

    testSuggestions(
      `from a | ${command} keywordField,/`,
      getFieldNamesByType('any').filter((name) => name !== 'keywordField'),
      ','
    );

    testSuggestions(
      `from a_index | eval round(doubleField) + 1 | eval \`round(doubleField) + 1\` + 1 | eval \`\`\`round(doubleField) + 1\`\` + 1\` + 1 | eval \`\`\`\`\`\`\`round(doubleField) + 1\`\`\`\` + 1\`\` + 1\` + 1 | eval \`\`\`\`\`\`\`\`\`\`\`\`\`\`\`round(doubleField) + 1\`\`\`\`\`\`\`\` + 1\`\`\`\` + 1\`\` + 1\` + 1 | ${command} /`,
      [
        ...getFieldNamesByType('any'),
        '`round(doubleField) + 1`',
        '```round(doubleField) + 1`` + 1`',
        '```````round(doubleField) + 1```` + 1`` + 1`',
        '```````````````round(doubleField) + 1```````` + 1```` + 1`` + 1`',
        '```````````````````````````````round(doubleField) + 1```````````````` + 1```````` + 1```` + 1`` + 1`',
      ]
    );

    it('should not suggest already-used fields and user defined columns', async () => {
      const { suggest: suggestTest } = await setup();
      const getSuggestions = async (query: string, opts?: SuggestOptions) =>
        (await suggestTest(query, opts)).map((value) => value.text);

      expect(
        await getSuggestions('from a_index | EVAL foo = 1 | KEEP /', {
          callbacks: {
            getColumnsFor: () => [...fields, { name: 'foo', type: 'integer', userDefined: false }],
          },
        })
      ).toContain('foo');
      expect(
        await getSuggestions('from a_index | EVAL foo = 1 | KEEP foo, /', {
          callbacks: {
            getColumnsFor: () => [...fields, { name: 'foo', type: 'integer', userDefined: false }],
          },
        })
      ).not.toContain('foo');

      expect(await getSuggestions('from a_index | KEEP /')).toContain('doubleField');
      expect(await getSuggestions('from a_index | KEEP doubleField, /')).not.toContain(
        'doubleField'
      );
    });
  });

  // @TODO: get updated eval block from main
  describe('values suggestions', () => {
    testSuggestions('FROM "i/"', []);
    testSuggestions('FROM "index/"', []);
    testSuggestions('FROM "  a/"', []);
    testSuggestions('FROM "foo b/"', []);
    testSuggestions('FROM a | WHERE tags == " /"', [], ' ');
    testSuggestions('FROM a | WHERE tags == """ /"""', [], ' ');
    testSuggestions('FROM a | WHERE tags == "a/"', []);
    testSuggestions('FROM a | EVAL tags == " /"', [], ' ');
    testSuggestions('FROM a | EVAL tags == "a"/', []);
    testSuggestions('FROM a | STATS tags == " /"', [], ' ');
    testSuggestions('FROM a | STATS tags == "a/"', []);
    testSuggestions('FROM a | GROK "a/" "%{WORD:firstWord}"', []);
    testSuggestions('FROM a | DISSECT "a/" "%{WORD:firstWord}"', []);
  });

  describe('callbacks', () => {
    it('should send the columns query only for the from part', async () => {
      const callbackMocks = createCustomCallbackMocks(undefined, undefined, undefined);
      const statement = 'from index_b | drop keywordField | eval col0 = abs(doubleField) ';

      const triggerOffset = statement.lastIndexOf(' ');
      await suggest(statement, triggerOffset + 1, callbackMocks);
      expect(callbackMocks.getColumnsFor).toHaveBeenCalledWith({
        query: 'FROM index_b',
      });
    });
    it('should send the fields query aware of the location', async () => {
      const callbackMocks = createCustomCallbackMocks(undefined, undefined, undefined);
      const statement = 'from index_d | drop | eval col0 = abs(doubleField) ';
      const triggerOffset = statement.lastIndexOf('p') + 1; // drop <here>
      await suggest(statement, triggerOffset + 1, callbackMocks);
      expect(callbackMocks.getColumnsFor).toHaveBeenCalledWith({ query: 'FROM index_d' });
    });
  });

  /**
   * Monaco asks for suggestions in at least two different scenarios.
   * 1. When the user types a non-whitespace character (e.g. 'FROM k') - this is the Invoke trigger kind
   * 2. When the user types a character we've registered as a trigger character (e.g. ',') - this is the Trigger character trigger kind
   *
   * Historically we had good support for the trigger character trigger kind, but not for the Invoke trigger kind. That led
   * to bad experiences like a list of sources not showing up when the user types 'FROM kib'. There they had to delete "kib"
   * and press <space> to trigger suggestions via a trigger character.
   *
   * See https://microsoft.github.io/monaco-editor/typedoc/enums/languages.CompletionTriggerKind.html for more details
   */
  describe('Invoke trigger kind (all commands)', () => {
    // source command
    let recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
      'FROM logs*',
      'dateField',
      'textField'
    );
    testSuggestions('f/', [
      ...getSourceAndHeaderCommands().map(attachTriggerCommand),
      ...mapRecommendedQueriesFromExtensions(editorExtensions.recommendedQueries),
      ...recommendedQuerySuggestions.map((q) => q.queryString),
    ]);

    const commands = getNonSourceHeaderCommands();

    // pipe command
    testSuggestions('FROM k | E/', commands);

    describe('function arguments', () => {
      // function argument
      testSuggestions('FROM kibana_sample_data_logs | EVAL TRIM(e/)', [
        ...getFieldNamesByType(['text', 'keyword']),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['text', 'keyword'],
          { scalar: true },
          undefined,
          ['trim']
        ),
      ]);

      // subsequent function argument
      const expectedDateDiff2ndArgSuggestions = [
        TIME_PICKER_SUGGESTION,
        ...TIME_SYSTEM_PARAMS.map((t) => `${t}, `),
        ...getFieldNamesByType(['date', 'date_nanos']).map((name) => `${name}, `),
        ...getFunctionSignaturesByReturnType(Location.EVAL, ['date', 'date_nanos'], {
          scalar: true,
        }).map((s) => ({
          ...s,
          text: `${s.text},`,
        })),
      ];
      testSuggestions('FROM a | EVAL DATE_DIFF("day", /)', expectedDateDiff2ndArgSuggestions);

      // trigger character case for comparison
      testSuggestions('FROM a | EVAL DATE_DIFF("day", /)', expectedDateDiff2ndArgSuggestions, ' ');
    });

    // FROM source
    testSuggestions('FROM k/', ['index1', 'index2'], undefined, [
      ,
      [
        { name: 'index1', hidden: false },
        { name: 'index2', hidden: false },
      ],
    ]);

    // FROM source METADATA
    recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates('', 'dateField');
    testSuggestions('FROM index1 M/', ['METADATA ']);

    // FROM source METADATA field
    testSuggestions('FROM index1 METADATA _/', METADATA_FIELDS);

    // EVAL argument
    testSuggestions('FROM index1 | EVAL b/', [
      'col0 = ',
      ...getFieldNamesByType('any').map((name) => `${name} `),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    testSuggestions('FROM index1 | EVAL col0 = f/', [
      ...getFieldNamesByType('any').map((name) => `${name} `),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    // DISSECT field
    testSuggestions(
      'FROM index1 | DISSECT b/',
      getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
    );

    // DROP (first field)
    testSuggestions('FROM index1 | DROP f/', getFieldNamesByType('any'));

    // DROP (subsequent field)
    testSuggestions('FROM index1 | DROP field1, f/', getFieldNamesByType('any'));

    // ENRICH policy
    testSuggestions(
      'FROM index1 | ENRICH p/',
      policies.map(({ name }) => getSafeInsertText(name) + ' ')
    );

    // ENRICH policy ON
    testSuggestions('FROM index1 | ENRICH policy O/', ['ON ', 'WITH ', '| ']);

    // ENRICH policy ON field
    testSuggestions(
      'FROM index1 | ENRICH policy ON f/',
      getFieldNamesByType('any').map((name) => `${name} `)
    );

    // ENRICH policy WITH policyfield
    testSuggestions('FROM index1 | ENRICH policy WITH v/', [
      'col0 = ',
      ...getPolicyFields('policy'),
    ]);

    testSuggestions('FROM index1 | ENRICH policy WITH \tv/', [
      'col0 = ',
      ...getPolicyFields('policy'),
    ]);

    // GROK field
    testSuggestions(
      'FROM index1 | GROK f/',
      getFieldNamesByType(ESQL_STRING_TYPES).map((field) => `${field} `),
      undefined
    );

    // KEEP (first field)
    testSuggestions('FROM index1 | KEEP f/', getFieldNamesByType('any'));

    // KEEP (subsequent fields)
    testSuggestions(
      'FROM index1 | KEEP booleanField, f/',
      getFieldNamesByType('any').filter((name) => name !== 'booleanField')
    );

    // LIMIT argument
    testSuggestions('FROM a | LIMIT 1/', ['10 ', '100 ', '1000 ']);

    // MV_EXPAND field
    testSuggestions(
      'FROM index1 | MV_EXPAND f/',
      getFieldNamesByType('any').map((name) => `${name} `)
    );

    // RENAME field
    testSuggestions('FROM index1 | RENAME f/', [
      'col0 = ',
      ...getFieldNamesByType('any').map((name) => `${name} `),
    ]);

    // RENAME field AS
    testSuggestions('FROM index1 | RENAME field A/', ['AS ']);

    // STATS argument
    testSuggestions('FROM index1 | STATS f/', [
      'col0 = ',
      'BY ',
      ...getFunctionSignaturesByReturnType(Location.STATS, 'any', {
        scalar: true,
        agg: true,
        grouping: true,
      }),
    ]);

    // STATS argument BY
    testSuggestions('FROM index1 | STATS AVG(doubleField) B/', [
      'WHERE ',
      'BY ',
      ', ',
      '| ',
      ...getFunctionSignaturesByReturnType(
        Location.STATS,
        'any',
        { operators: true, skipAssign: true },
        ['double']
      ),
    ]);

    // STATS argument BY expression
    testSuggestions('FROM index1 | STATS field BY f/', [
      'col0 = ',
      { ...getDateHistogramCompletionItem(), sortText: '0000' },
      ...getFunctionSignaturesByReturnType(Location.STATS, 'any', { grouping: true, scalar: true }),
      ...getFieldNamesByType('any'),
    ]);

    // WHERE argument
    testSuggestions('FROM index1 | WHERE f/', [
      ...getFieldNamesByType('any').map((field) => `${field} `),
      ...getFunctionSignaturesByReturnType(Location.WHERE, 'any', { scalar: true }),
    ]);

    // WHERE argument comparison
    testSuggestions(
      'FROM index1 | WHERE keywordField i/',
      getFunctionSignaturesByReturnType(
        Location.WHERE,
        'boolean',
        {
          operators: true,
          skipAssign: true,
        },
        ['keyword'],
        ['and', 'or', 'not']
      )
    );

    // WHERE function <suggest>
    testSuggestions(
      'FROM index1 | WHERE ABS(integerField) i/',
      getFunctionSignaturesByReturnType(
        Location.WHERE,
        'any',
        {
          operators: true,
          skipAssign: true,
        },
        ['integer'],
        ['and', 'or', 'not']
      )
    );
  });

  describe('advancing the cursor and opening the suggestion menu automatically ✨', () => {
    /**
     * NOTE: Monaco uses an Invoke trigger kind when the show suggestions action is triggered (e.g. accepting the "FROM" suggestion)
     */

    const attachAsSnippet = (s: PartialSuggestionWithText): PartialSuggestionWithText => ({
      ...s,
      asSnippet: true,
    });
    let recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
      'FROM logs*',
      'dateField',
      'textField'
    );
    // Source command
    testSuggestions('F/', [
      ...getSourceAndHeaderCommands().map(attachTriggerCommand),
      ...mapRecommendedQueriesFromExtensions(editorExtensions.recommendedQueries),
      ...recommendedQuerySuggestions.map((q) => q.queryString),
    ]);

    const commands = getNonSourceHeaderCommands();

    // Pipe command
    testSuggestions(
      'FROM a | E/',
      commands.map((name) => attachTriggerCommand(name))
    );

    describe('function arguments', () => {
      // literalSuggestions parameter
      const dateDiffFirstParamSuggestions =
        scalarFunctionDefinitions.find(({ name }) => name === 'date_diff')?.signatures[0]
          .params?.[0].suggestedValues ?? [];
      testSuggestions(
        'FROM a | EVAL DATE_DIFF(/)',
        dateDiffFirstParamSuggestions.map((s) => `"${s}", `).map(attachTriggerCommand)
      );

      // field parameter

      const expectedStringSuggestionsWhenMoreArgsAreNeeded = [
        ...getFieldNamesByType(ESQL_STRING_TYPES)
          .map((field) => `${field}, `)
          .map(attachTriggerCommand),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ESQL_STRING_TYPES,
          { scalar: true },
          undefined,
          ['replace']
        ).map((s) => ({
          ...s,
          text: `${s.text},`,
        })),
      ];

      testSuggestions('FROM a | EVAL REPLACE(/)', expectedStringSuggestionsWhenMoreArgsAreNeeded);

      // subsequent parameter
      testSuggestions(
        'FROM a | EVAL REPLACE(keywordField, /)',
        expectedStringSuggestionsWhenMoreArgsAreNeeded
      );

      // final parameter — should not advance!
      testSuggestions('FROM a | EVAL REPLACE(keywordField, keywordField, /)', [
        ...getFieldNamesByType(ESQL_STRING_TYPES).map((field) => ({
          text: field,
        })),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ESQL_STRING_TYPES,
          { scalar: true },
          undefined,
          ['replace']
        ),
      ]);

      // Trigger character because this is how it will actually be... the user will press
      // space-bar... this may change if we fix the tokenization of timespan literals
      // such that "2 days" is a single monaco token
      testSuggestions(
        'FROM a | EVAL DATE_TRUNC(2 /)',
        [...timeUnitsToSuggest.map((s) => `${s.name}, `).map(attachTriggerCommand), ','],
        ' '
      );
    });

    recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
      '',
      'dateField',
      'textField'
    );

    // PIPE (|)
    testSuggestions('FROM a /', [
      attachTriggerCommand('| '),
      ',',
      attachTriggerCommand('METADATA '),
      ...recommendedQuerySuggestions.map((q) => q.queryString),
    ]);

    // Assignment
    testSuggestions(`FROM a | ENRICH policy on b with /`, [
      attachTriggerCommand('col0 = '),
      ...getPolicyFields('policy'),
    ]);

    // FROM source
    describe('sources', () => {
      testSuggestions(
        'FROM /',
        [
          withAutoSuggest({ text: '(FROM $0)' } as ISuggestionItem),
          withAutoSuggest({ text: 'index1' } as ISuggestionItem),
          withAutoSuggest({ text: 'index2' } as ISuggestionItem),
        ],
        undefined,
        [
          ,
          [
            { name: 'index1', hidden: false },
            { name: 'index2', hidden: false },
          ],
        ]
      );

      testSuggestions(
        'FROM index/',
        [
          withAutoSuggest({ text: 'index1' } as ISuggestionItem),
          withAutoSuggest({ text: 'index2' } as ISuggestionItem),
        ],
        undefined,
        [
          ,
          [
            { name: 'index1', hidden: false },
            { name: 'index2', hidden: false },
          ],
        ]
      );
      recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
        '',
        'dateField',
        'textField'
      );

      testSuggestions(
        'FROM index1/',
        [
          withAutoSuggest({
            text: 'index1 | ',
            filterText: 'index1',
          } as ISuggestionItem),
          withAutoSuggest({
            text: 'index1, ',
            filterText: 'index1',
          } as ISuggestionItem),
          withAutoSuggest({
            text: 'index1 METADATA ',
            filterText: 'index1',
          } as ISuggestionItem),
          ...recommendedQuerySuggestions.map((q) => `index1${q.queryString}`),
        ],
        undefined,
        [
          ,
          [
            { name: 'index1', hidden: false },
            { name: 'index2', hidden: false },
          ],
        ]
      );

      recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
        '',
        'dateField',
        'textField'
      );
      testSuggestions(
        'FROM index1, index2/',
        [
          withAutoSuggest({ text: '(FROM $0)' } as ISuggestionItem),
          withAutoSuggest({
            text: 'index2 | ',
            filterText: 'index2',
          } as ISuggestionItem),
          withAutoSuggest({
            text: 'index2, ',
            filterText: 'index2',
          } as ISuggestionItem),
          withAutoSuggest({
            text: 'index2 METADATA ',
            filterText: 'index2',
          } as ISuggestionItem),
          ...recommendedQuerySuggestions.map((q) => `index2${q.queryString}`),
        ],
        undefined,
        [
          ,
          [
            { name: 'index1', hidden: false },
            { name: 'index2', hidden: false },
          ],
        ]
      );

      // This is a source name that contains a special character
      // meaning that Monaco by default will only set the replacement
      // range to cover "bar" and not "foo$bar". We have to make sure
      // we're setting it ourselves.
      recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
        '',
        'dateField',
        'textField'
      );
      testSuggestions(
        'FROM foo$bar/',
        [
          withAutoSuggest({
            text: 'foo$bar | ',
            filterText: 'foo$bar',
            rangeToReplace: { start: 5, end: 12 },
          } as ISuggestionItem),
          withAutoSuggest({
            text: 'foo$bar, ',
            filterText: 'foo$bar',
            rangeToReplace: { start: 5, end: 12 },
          } as ISuggestionItem),
          withAutoSuggest({
            text: 'foo$bar METADATA ',
            filterText: 'foo$bar',
            rangeToReplace: { start: 5, end: 12 },
          } as ISuggestionItem),
          ...recommendedQuerySuggestions.map((q) => `foo$bar${q.queryString}`),
        ],
        undefined,
        [, [{ name: 'foo$bar', hidden: false }]]
      );

      // This is an identifier that matches multiple sources
      recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
        '',
        'dateField',
        'textField'
      );
      testSuggestions(
        'FROM i*/',
        [
          withAutoSuggest({ text: 'i* | ', filterText: 'i*' } as ISuggestionItem),
          withAutoSuggest({ text: 'i*, ', filterText: 'i*' } as ISuggestionItem),
          withAutoSuggest({
            text: 'i* METADATA ',
            filterText: 'i*',
          } as ISuggestionItem),
          ...recommendedQuerySuggestions.map((q) => `i*${q.queryString}`),
        ],
        undefined,
        [
          ,
          [
            { name: 'index1', hidden: false },
            { name: 'index2', hidden: false },
          ],
        ]
      );
    });

    recommendedQuerySuggestions = getRecommendedQueriesSuggestionsFromTemplates(
      '',
      'dateField',
      'textField'
    );
    // FROM source METADATA
    testSuggestions('FROM index1 M/', [attachTriggerCommand('METADATA ')]);

    describe('ENRICH', () => {
      testSuggestions(
        'FROM a | ENRICH /',
        policies.map((p) => `${getSafeInsertText(p.name)} `).map(attachTriggerCommand)
      );
      testSuggestions(
        'FROM a | ENRICH pol/',
        policies
          .map((p) => `${getSafeInsertText(p.name)} `)
          .map(attachTriggerCommand)
          .map((s) => ({ ...s, rangeToReplace: { start: 17, end: 20 } }))
      );
      testSuggestions('FROM a | ENRICH policy /', ['ON ', 'WITH ', '| '].map(attachTriggerCommand));

      testSuggestions(
        'FROM a | ENRICH policy ON /',
        getFieldNamesByType('any')
          .map((name) => `${name} `)
          .map(attachTriggerCommand)
      );
      testSuggestions(
        'FROM a | ENRICH policy ON @timestamp /',
        ['WITH ', '| '].map(attachTriggerCommand)
      );
      // nothing fancy with this field list
      testSuggestions('FROM a | ENRICH policy ON @timestamp WITH /', [
        'col0 = ',
        ...getPolicyFields('policy'),
      ]);
      describe('replacement range', () => {
        testSuggestions('FROM a | ENRICH policy ON @timestamp WITH othe/', [
          'col0 = ',
          ...getPolicyFields('policy').map((name) => ({
            text: name,
            rangeToReplace: { start: 43, end: 47 },
          })),
        ]);
        testSuggestions(
          'FROM a | ENRICH policy ON @timestamp WITH col0 = othe/',
          getPolicyFields('policy').map((name) => ({
            text: name,
            rangeToReplace: { start: 50, end: 54 },
          }))
        );
      });
    });

    // LIMIT number
    testSuggestions('FROM a | LIMIT /', ['10 ', '100 ', '1000 '].map(attachTriggerCommand));

    // STATS argument
    testSuggestions(
      'FROM a | STATS /',
      [
        'BY ',
        'col0 = ',
        ...getFunctionSignaturesByReturnType(Location.STATS, 'any', {
          scalar: true,
          agg: true,
          grouping: true,
        })
          .map(attachAsSnippet)
          .map(attachParameterHelperCommand),
      ].map(attachTriggerCommand)
    );

    // STATS argument BY
    testSuggestions('FROM a | STATS AVG(integerField) /', [
      ', ',
      attachTriggerCommand('WHERE '),
      attachTriggerCommand('BY '),
      attachTriggerCommand('| '),
      ...getFunctionSignaturesByReturnType(
        Location.STATS,
        'any',
        {
          operators: true,
          skipAssign: true,
        },
        ['integer']
      ),
    ]);

    // STATS argument BY field
    const allByCompatibleFunctions = getFunctionSignaturesByReturnType(
      Location.STATS,
      'any',
      {
        scalar: true,
        grouping: true,
      },
      undefined,
      undefined,
      'by'
    );
    testSuggestions('FROM a | STATS AVG(numberField) BY /', [
      { ...getDateHistogramCompletionItem(), sortText: '0000' },
      attachTriggerCommand('col0 = '),
      ...getFieldNamesByType('any').map(attachTriggerCommand),
      ...allByCompatibleFunctions,
    ]);

    // STATS argument BY assignment (checking field suggestions)
    testSuggestions('FROM a | STATS AVG(numberField) BY col0 = /', [
      { ...getDateHistogramCompletionItem(), sortText: '0000' },
      ...getFieldNamesByType('any').map(attachTriggerCommand),
      ...allByCompatibleFunctions,
    ]);

    // WHERE argument (field suggestions)
    testSuggestions('FROM a | WHERE /', [
      ...getFieldNamesByType('any')
        .map((field) => `${field} `)
        .map(attachTriggerCommand),
      ...getFunctionSignaturesByReturnType(Location.WHERE, 'any', { scalar: true }).map(
        attachAsSnippet
      ),
    ]);

    // WHERE argument comparison (keyword fields get only string operators)
    testSuggestions(
      'FROM a | WHERE keywordField /',
      getFunctionSignaturesByReturnType(
        Location.WHERE,
        'boolean',
        {
          operators: true,
          skipAssign: true,
        },
        ['keyword']
      ).map((s) => (s.text.toLowerCase().includes('null') ? s : attachTriggerCommand(s)))
    );

    describe('field lists', () => {
      describe('METADATA <field>', () => {
        // METADATA field
        testSuggestions('FROM a METADATA /', METADATA_FIELDS.map(attachTriggerCommand));
        testSuggestions('FROM a METADATA _i/', METADATA_FIELDS.map(attachTriggerCommand));
        testSuggestions(
          'FROM a METADATA _id/',
          [
            { filterText: '_id', text: '_id, ' },
            { filterText: '_id', text: '_id | ' },
          ].map(attachTriggerCommand)
        );
        testSuggestions(
          'FROM a METADATA _id, /',
          METADATA_FIELDS.filter((field) => field !== '_id').map(attachTriggerCommand)
        );
        testSuggestions(
          'FROM a METADATA _id, _ignored/',
          [
            { filterText: '_ignored', text: '_ignored, ' },
            { filterText: '_ignored', text: '_ignored | ' },
          ].map(attachTriggerCommand)
        );
        // comma if there's even one more field
        testSuggestions('FROM a METADATA _id, _ignored, _index, _source/', [
          withAutoSuggest({
            filterText: '_source',
            text: '_source | ',
          } as ISuggestionItem),
          withAutoSuggest({
            filterText: '_source',
            text: '_source, ',
          } as ISuggestionItem),
        ]);
        // no comma if there are no more fields
        testSuggestions(
          'FROM a METADATA _id, _ignored, _index, _source, _index_mode, _score, _version/',
          [
            withAutoSuggest({
              filterText: '_version',
              text: '_version | ',
            } as ISuggestionItem),
          ]
        );
      });

      describe.each(['KEEP', 'DROP'])('%s <field>', (commandName) => {
        // KEEP field
        testSuggestions(
          `FROM a | ${commandName} /`,
          getFieldNamesByType('any').map(attachTriggerCommand)
        );
        testSuggestions(
          `FROM a | ${commandName} d/`,
          getFieldNamesByType('any')
            .map<PartialSuggestionWithText>((text) => ({
              text,
              rangeToReplace: { start: 14, end: 15 },
            }))
            .map(attachTriggerCommand)
        );
        testSuggestions(
          `FROM a | ${commandName} doubleFiel/`,
          getFieldNamesByType('any').map(attachTriggerCommand)
        );
        testSuggestions(
          `FROM a | ${commandName} doubleField/`,
          ['doubleField, ', 'doubleField | ']
            .map((text) => ({
              text,
              filterText: 'doubleField',
              rangeToReplace: { start: 14, end: 25 },
            }))
            .map(attachTriggerCommand)
        );
        // testSuggestions('FROM a | KEEP doubleField /', ['| ', ',']);
        // // Let's get funky with the field names
        // testSuggestions(
        //   `FROM b | ${commandName} @timestamp/`,
        //   ['@timestamp, ', '@timestamp | ']
        //     .map((text) => ({
        //       text,
        //       filterText: '@timestamp',
        //       rangeToReplace: { start: 14, end: 24 },
        //     }))
        //     .map(attachTriggerCommand),
        //   undefined,
        //   [
        //     [
        //       { name: '@timestamp', type: 'date' },
        //       { name: 'utc_stamp', type: 'date' },
        //     ],
        //   ]
        // );
        // testSuggestions(
        //   `FROM c | ${commandName} foo.bar/`,
        //   ['foo.bar, ', 'foo.bar | ']
        //     .map((text) => ({
        //       text,
        //       filterText: 'foo.bar',
        //       rangeToReplace: { start: 14, end: 21 },
        //     }))
        //     .map(attachTriggerCommand),
        //   undefined,
        //   [
        //     [
        //       { name: 'foo.bar', type: 'double' },
        //       { name: 'baz', type: 'date' },
        //     ],
        //   ]
        // );

        // describe('escaped field names', () => {
        //   testSuggestions(
        //     `FROM c | ${commandName} \`foo.bar\`/`,
        //     ['`foo.bar`, ', '`foo.bar` | '],
        //     undefined,
        //     [
        //       [
        //         { name: 'foo.bar', type: 'double' },
        //         { name: 'baz', type: 'date' }, // added so that we get a comma suggestion
        //       ],
        //     ]
        //   );
        //   testSuggestions(
        //     `FROM d | ${commandName} \`foo\`\`\`\`bar\`\`baz\`/`,
        //     ['`foo````bar``baz`, ', '`foo````bar``baz` | '],
        //     undefined,
        //     [
        //       [
        //         { name: 'foo``bar`baz', type: 'double' },
        //         { name: 'baz', type: 'date' }, // added so that we get a comma suggestion
        //       ],
        //     ]
        //   );
        //   testSuggestions(`FROM a | ${commandName} \`any#Char$Field\`/`, [
        //     '`any#Char$Field`, ',
        //     '`any#Char$Field` | ',
        //   ]);
        //   // @todo enable this test when we can use AST to support this case
        //   testSuggestions.skip(
        //     `FROM a | ${commandName} \`foo\`.\`bar\`/`,
        //     ['`foo`.`bar`, ', '`foo`.`bar` | '],
        //     undefined,
        //     [[{ name: 'foo.bar', type: 'double' }]]
        //   );
        // });

        // // Subsequent fields
        // testSuggestions(
        //   `FROM a | ${commandName} doubleField, dateFiel/`,
        //   getFieldNamesByType('any')
        //     .filter((s) => s !== 'doubleField')
        //     .map(attachTriggerCommand)
        // );
        // testSuggestions(`FROM a | ${commandName} doubleField, dateField/`, [
        //   'dateField, ',
        //   'dateField | ',
        // ]);

        // // out of fields
        // testSuggestions(
        //   `FROM e | ${commandName} doubleField, dateField/`,
        //   ['dateField | '],
        //   undefined,
        //   [
        //     [
        //       { name: 'doubleField', type: 'double' },
        //       { name: 'dateField', type: 'date' },
        //     ],
        //   ]
        // );
      });
    });
  });

  describe('IN operator with lists', () => {
    testSuggestions('FROM a | WHERE integerField IN (doubleField /', [{ text: ',' }]);
  });

  describe('Replacement ranges are attached when needed', () => {
    testSuggestions('FROM a | WHERE doubleField IS NOT N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 27, end: 35 } },
    ]);
    testSuggestions('FROM a | WHERE doubleField IS N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 27, end: 31 } },
      { text: 'IS NULL', rangeToReplace: { start: 27, end: 31 } },
    ]);
    testSuggestions('FROM a | EVAL doubleField IS NOT N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 26, end: 34 } },
    ]);

    describe('dot-separated field names', () => {
      testSuggestions(
        'FROM index_a | KEEP field.nam/',
        [{ text: 'field.name', rangeToReplace: { start: 20, end: 29 } }],
        undefined,
        [[{ name: 'field.name', type: 'double', userDefined: false }]]
      );
      // multi-line
      testSuggestions(
        'FROM index_a\n| KEEP field.nam/',
        [{ text: 'field.name', rangeToReplace: { start: 20, end: 29 } }],
        undefined,
        [[{ name: 'field.name', type: 'double', userDefined: false }]]
      );
      // triple separator
      testSuggestions(
        'FROM index_c\n| KEEP field.name.f/',
        [{ text: 'field.name.foo', rangeToReplace: { start: 20, end: 32 } }],
        undefined,
        [[{ name: 'field.name.foo', type: 'double', userDefined: false }]]
      );
      // whitespace — we can't support this case yet because
      // we are relying on string checking instead of the AST :(
      testSuggestions.skip(
        'FROM index_a | KEEP field . n/',
        [{ text: 'field . name', rangeToReplace: { start: 14, end: 22 } }],
        undefined,
        [[{ name: 'field.name', type: 'double', userDefined: false }]]
      );
    });
  });

  describe('Unmmapped fields', () => {
    describe('should suggest unmapped field after its first usage if unmapped is LOAD or NULLIFY', () => {
      testSuggestions('SET unmapped_fields = "LOAD"; FROM a | WHERE unmappedField > 0 | KEEP /', [
        ...getFieldNamesByType('any'),
        { text: 'unmappedField' },
      ]);
      testSuggestions(
        'SET unmapped_fields = "NULLIFY"; FROM a | WHERE unmappedField > 0 | KEEP /',
        [...getFieldNamesByType('any'), { text: 'unmappedField' }]
      );
    });
    describe('should not suggest unmapped field after its first usage if unmapped is FAIL', () => {
      testSuggestions('SET unmapped_fields = "FAIL"; FROM a | WHERE unmappedField > 0 | KEEP /', [
        ...getFieldNamesByType('any'),
      ]);
    });
    describe('unmapped fields should be considered in columnsAfter methods', () => {
      // Don't suggest unmappedField because it was dropped
      testSuggestions(
        'SET unmapped_fields = "LOAD"; FROM a | WHERE unmappedField > 0|  DROP unmappedField | KEEP /',
        [...getFieldNamesByType('any')]
      );
      // Suggest only the unmappedField because it was kept
      testSuggestions(
        'SET unmapped_fields = "LOAD"; FROM a | WHERE unmappedField > 0|  KEEP unmappedField | KEEP /',
        [{ text: 'unmappedField' }]
      );
      // Don't suggest unmappedField because STATS destroyed all fields
      testSuggestions(
        'SET unmapped_fields = "LOAD"; FROM a | WHERE unmappedField > 0 | STATS col0 = AVG(3) | KEEP /',
        [{ text: 'col0' }]
      );
    });
  });
});
