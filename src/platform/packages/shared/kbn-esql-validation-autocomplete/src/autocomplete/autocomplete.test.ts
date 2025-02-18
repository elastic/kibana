/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { suggest } from './autocomplete';
import { scalarFunctionDefinitions } from '../definitions/generated/scalar_functions';
import { timeUnitsToSuggest } from '../definitions/literals';
import { commandDefinitions as unmodifiedCommandDefinitions } from '../definitions/commands';
import { getSafeInsertText, TIME_SYSTEM_PARAMS, TRIGGER_SUGGESTION_COMMAND } from './factories';
import { camelCase } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import {
  policies,
  getFunctionSignaturesByReturnType,
  getFieldNamesByType,
  createCustomCallbackMocks,
  createCompletionContext,
  getPolicyFields,
  PartialSuggestionWithText,
  TIME_PICKER_SUGGESTION,
  setup,
  attachTriggerCommand,
  SuggestOptions,
  fields,
} from './__tests__/helpers';
import { METADATA_FIELDS } from '../shared/constants';
import { ESQL_STRING_TYPES } from '../shared/esql_types';
import { getRecommendedQueries } from './recommended_queries/templates';
import { getDateHistogramCompletionItem } from './commands/stats/util';

const commandDefinitions = unmodifiedCommandDefinitions.filter(({ hidden }) => !hidden);

const getRecommendedQueriesSuggestions = (fromCommand: string, timeField?: string) =>
  getRecommendedQueries({
    fromCommand,
    timeField,
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

  // const sourceCommands = ['row', 'from', 'show', 'metrics']; Uncomment when metrics is being released
  const sourceCommands = ['row', 'from', 'show'];

  describe('New command', () => {
    const recommendedQuerySuggestions = getRecommendedQueriesSuggestions('FROM logs*', 'dateField');
    testSuggestions('/', [
      ...sourceCommands.map((name) => name.toUpperCase() + ' $0'),
      ...recommendedQuerySuggestions.map((q) => q.queryString),
    ]);
    const commands = commandDefinitions
      .filter(({ name }) => !sourceCommands.includes(name))
      .map(({ name, types }) => {
        if (types && types.length) {
          const cmds: string[] = [];
          for (const type of types) {
            const cmd = type.name.toUpperCase() + ' ' + name.toUpperCase() + ' $0';
            cmds.push(cmd);
          }
          return cmds;
        } else {
          return name.toUpperCase() + ' $0';
        }
      })
      .flat();

    testSuggestions('from a | /', commands);
    testSuggestions('from a metadata _id | /', commands);
    testSuggestions('from a | eval var0 = a | /', commands);
    testSuggestions('from a metadata _id | eval var0 = a | /', commands);
  });

  describe('limit', () => {
    testSuggestions('from a | limit /', ['10 ', '100 ', '1000 ']);
    testSuggestions('from a | limit 4 /', ['| ']);
  });

  describe('mv_expand', () => {
    testSuggestions('from a | mv_expand /', getFieldNamesByType('any'));
    testSuggestions('from a | mv_expand a /', ['| ']);
  });

  describe('rename', () => {
    testSuggestions('from a | rename /', getFieldNamesByType('any'));
    testSuggestions('from a | rename keywordField /', ['AS $0'], ' ');
    testSuggestions('from a | rename keywordField as /', ['var0']);
  });

  for (const command of ['keep', 'drop']) {
    describe(command, () => {
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
        ],
        undefined,
        [
          [
            ...fields,
            // the following non-field columns will come over the wire as part of the response
            {
              name: 'round(doubleField) + 1',
              type: 'double',
            },
            {
              name: '`round(doubleField) + 1` + 1',
              type: 'double',
            },
            {
              name: '```round(doubleField) + 1`` + 1` + 1',
              type: 'double',
            },
            {
              name: '```````round(doubleField) + 1```` + 1`` + 1` + 1',
              type: 'double',
            },
            {
              name: '```````````````round(doubleField) + 1```````` + 1```` + 1`` + 1` + 1',
              type: 'double',
            },
          ],
        ]
      );

      it('should not suggest already-used fields and variables', async () => {
        const { suggest: suggestTest } = await setup();
        const getSuggestions = async (query: string, opts?: SuggestOptions) =>
          (await suggestTest(query, opts)).map((value) => value.text);

        expect(
          await getSuggestions('from a_index | EVAL foo = 1 | KEEP /', {
            callbacks: { getColumnsFor: () => [...fields, { name: 'foo', type: 'integer' }] },
          })
        ).toContain('foo');
        expect(
          await getSuggestions('from a_index | EVAL foo = 1 | KEEP foo, /', {
            callbacks: { getColumnsFor: () => [...fields, { name: 'foo', type: 'integer' }] },
          })
        ).not.toContain('foo');

        expect(await getSuggestions('from a_index | KEEP /')).toContain('doubleField');
        expect(await getSuggestions('from a_index | KEEP doubleField, /')).not.toContain(
          'doubleField'
        );
      });
    });
  }

  describe('enrich', () => {
    const modes = ['any', 'coordinator', 'remote'];
    const expectedPolicyNameSuggestions = policies
      .map(({ name, suggestedAs }) => suggestedAs || name)
      .map((name) => `${name} `);
    for (const prevCommand of [
      '',
      // '| enrich other-policy ',
      // '| enrich other-policy on b ',
      // '| enrich other-policy with c ',
    ]) {
      testSuggestions(`from a ${prevCommand}| enrich /`, expectedPolicyNameSuggestions);
      testSuggestions(
        `from a ${prevCommand}| enrich _/`,
        modes.map((mode) => `_${mode}:$0`),
        '_'
      );
      for (const mode of modes) {
        testSuggestions(
          `from a ${prevCommand}| enrich _${mode}:/`,
          expectedPolicyNameSuggestions,
          ':'
        );
        testSuggestions(
          `from a ${prevCommand}| enrich _${mode.toUpperCase()}:/`,
          expectedPolicyNameSuggestions,
          ':'
        );
        testSuggestions(
          `from a ${prevCommand}| enrich _${camelCase(mode)}:/`,
          expectedPolicyNameSuggestions,
          ':'
        );
      }
      testSuggestions(`from a ${prevCommand}| enrich policy /`, ['ON $0', 'WITH $0', '| ']);
      testSuggestions(
        `from a ${prevCommand}| enrich policy on /`,
        getFieldNamesByType('any').map((v) => `${v} `)
      );
      testSuggestions(`from a ${prevCommand}| enrich policy on b /`, ['WITH $0', '| ']);
      testSuggestions(
        `from a ${prevCommand}| enrich policy on b with /`,
        ['var0 = ', ...getPolicyFields('policy')],
        ' '
      );
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 /`, ['= $0', ',', '| ']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = /`, [
        ...getPolicyFields('policy'),
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = keywordField /`, [
        ',',
        '| ',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = keywordField, /`, [
        'var1 = ',
        ...getPolicyFields('policy'),
      ]);
      testSuggestions(
        `from a ${prevCommand}| enrich policy on b with var0 = keywordField, var1 /`,
        ['= $0', ',', '| ']
      );
      testSuggestions(
        `from a ${prevCommand}| enrich policy on b with var0 = keywordField, var1 = /`,
        [...getPolicyFields('policy')]
      );
      testSuggestions(
        `from a ${prevCommand}| enrich policy with /`,
        ['var0 = ', ...getPolicyFields('policy')],
        ' '
      );
      testSuggestions(`from a ${prevCommand}| enrich policy with keywordField /`, [
        '= $0',
        ',',
        '| ',
      ]);
    }
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
    it('should send the columns query without the last command', async () => {
      const callbackMocks = createCustomCallbackMocks(undefined, undefined, undefined);
      const statement = 'from a | drop keywordField | eval var0 = abs(doubleField) ';
      const triggerOffset = statement.lastIndexOf(' ');
      const context = createCompletionContext(statement[triggerOffset]);
      await suggest(
        statement,
        triggerOffset + 1,
        context,
        async (text) => (text ? getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
        callbackMocks
      );
      expect(callbackMocks.getColumnsFor).toHaveBeenCalledWith({
        query: 'from a | drop keywordField',
      });
    });
    it('should send the fields query aware of the location', async () => {
      const callbackMocks = createCustomCallbackMocks(undefined, undefined, undefined);
      const statement = 'from a | drop | eval var0 = abs(doubleField) ';
      const triggerOffset = statement.lastIndexOf('p') + 1; // drop <here>
      const context = createCompletionContext(statement[triggerOffset]);
      await suggest(
        statement,
        triggerOffset + 1,
        context,
        async (text) => (text ? getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
        callbackMocks
      );
      expect(callbackMocks.getColumnsFor).toHaveBeenCalledWith({ query: 'from a' });
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
    let recommendedQuerySuggestions = getRecommendedQueriesSuggestions('FROM logs*', 'dateField');
    testSuggestions('f/', [
      ...sourceCommands.map((cmd) => `${cmd.toUpperCase()} $0`),
      ...recommendedQuerySuggestions.map((q) => q.queryString),
    ]);

    const commands = commandDefinitions
      .filter(({ name }) => !sourceCommands.includes(name))
      .map(({ name, types }) => {
        if (types && types.length) {
          const cmds: string[] = [];
          for (const type of types) {
            const cmd = type.name.toUpperCase() + ' ' + name.toUpperCase() + ' $0';
            cmds.push(cmd);
          }
          return cmds;
        } else {
          return name.toUpperCase() + ' $0';
        }
      })
      .flat();

    // pipe command
    testSuggestions('FROM k | E/', commands);

    describe('function arguments', () => {
      // function argument
      testSuggestions('FROM kibana_sample_data_logs | EVAL TRIM(e/)', [
        ...getFieldNamesByType(['text', 'keyword']),
        ...getFunctionSignaturesByReturnType(
          'eval',
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
        ...getFunctionSignaturesByReturnType('eval', ['date', 'date_nanos'], { scalar: true }).map(
          (s) => ({
            ...s,
            text: `${s.text},`,
          })
        ),
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
    recommendedQuerySuggestions = getRecommendedQueriesSuggestions('', 'dateField');
    testSuggestions('FROM index1 M/', ['METADATA $0']);

    // FROM source METADATA field
    testSuggestions('FROM index1 METADATA _/', METADATA_FIELDS);

    // EVAL argument
    testSuggestions('FROM index1 | EVAL b/', [
      'var0 = ',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);

    testSuggestions('FROM index1 | EVAL var0 = f/', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
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
    testSuggestions('FROM index1 | ENRICH policy O/', ['ON $0', 'WITH $0', '| ']);

    // ENRICH policy ON field
    testSuggestions(
      'FROM index1 | ENRICH policy ON f/',
      getFieldNamesByType('any').map((name) => `${name} `)
    );

    // ENRICH policy WITH policyfield
    testSuggestions('FROM index1 | ENRICH policy WITH v/', [
      'var0 = ',
      ...getPolicyFields('policy'),
    ]);

    testSuggestions('FROM index1 | ENRICH policy WITH \tv/', [
      'var0 = ',
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
    // Here we actually test that the invoke trigger kind does NOT work
    // the assumption is that it isn't very useful to see literal suggestions when already typing a number
    // I'm not sure if this is true or not, but it's the current behavior
    testSuggestions('FROM a | LIMIT 1/', ['| ']);

    // MV_EXPAND field
    testSuggestions('FROM index1 | MV_EXPAND f/', getFieldNamesByType('any'));

    // RENAME field
    testSuggestions('FROM index1 | RENAME f/', getFieldNamesByType('any'));

    // RENAME field AS
    testSuggestions('FROM index1 | RENAME field A/', ['AS $0']);

    // RENAME field AS var0
    testSuggestions('FROM index1 | RENAME field AS v/', ['var0']);

    // STATS argument
    testSuggestions('FROM index1 | STATS f/', [
      'var0 = ',
      ...getFunctionSignaturesByReturnType('stats', 'any', {
        scalar: true,
        agg: true,
        grouping: true,
      }),
    ]);

    // STATS argument BY
    testSuggestions('FROM index1 | STATS AVG(booleanField) B/', ['BY ', ', ', '| ']);

    // STATS argument BY expression
    testSuggestions('FROM index1 | STATS field BY f/', [
      'var0 = ',
      getDateHistogramCompletionItem(),
      ...getFunctionSignaturesByReturnType('stats', 'any', { grouping: true, scalar: true }),
      ...getFieldNamesByType('any').map((field) => `${field} `),
    ]);

    // WHERE argument
    testSuggestions('FROM index1 | WHERE f/', [
      ...getFieldNamesByType('any').map((field) => `${field} `),
      ...getFunctionSignaturesByReturnType('where', 'any', { scalar: true }),
    ]);

    // WHERE argument comparison
    testSuggestions(
      'FROM index1 | WHERE keywordField i/',
      getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
        },
        undefined,
        ['and', 'or', 'not']
      )
    );

    // WHERE function <suggest>
    testSuggestions(
      'FROM index1 | WHERE ABS(integerField) i/',
      getFunctionSignaturesByReturnType(
        'where',
        'any',
        {
          builtin: true,
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
    let recommendedQuerySuggestions = getRecommendedQueriesSuggestions('FROM logs*', 'dateField');
    // Source command
    testSuggestions('F/', [
      ...['FROM $0', 'ROW $0', 'SHOW $0'].map(attachTriggerCommand).map(attachAsSnippet),
      ...recommendedQuerySuggestions.map((q) => q.queryString),
    ]);

    const commands = commandDefinitions
      .filter(({ name }) => !sourceCommands.includes(name))
      .map(({ name, types }) => {
        if (types && types.length) {
          const cmds: string[] = [];
          for (const type of types) {
            const cmd = type.name.toUpperCase() + ' ' + name.toUpperCase() + ' $0';
            cmds.push(cmd);
          }
          return cmds;
        } else {
          return name.toUpperCase() + ' $0';
        }
      })
      .flat();

    // Pipe command
    testSuggestions(
      'FROM a | E/',
      commands.map((name) => attachTriggerCommand(name)).map(attachAsSnippet) // TODO consider making this check more fundamental
    );

    describe('function arguments', () => {
      // literalSuggestions parameter
      const dateDiffFirstParamSuggestions =
        scalarFunctionDefinitions.find(({ name }) => name === 'date_diff')?.signatures[0]
          .params?.[0].literalSuggestions ?? [];
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
          'eval',
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
          command: undefined,
        })),
        ...getFunctionSignaturesByReturnType(
          'eval',
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

    recommendedQuerySuggestions = getRecommendedQueriesSuggestions('', 'dateField');

    // PIPE (|)
    testSuggestions('FROM a /', [
      attachTriggerCommand('| '),
      ',',
      attachAsSnippet(attachTriggerCommand('METADATA $0')),
      ...recommendedQuerySuggestions.map((q) => q.queryString),
    ]);

    // Assignment
    testSuggestions(`FROM a | ENRICH policy on b with /`, [
      attachTriggerCommand('var0 = '),
      ...getPolicyFields('policy'),
    ]);

    // FROM source
    describe('sources', () => {
      testSuggestions(
        'FROM /',
        [
          { text: 'index1', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index2', command: TRIGGER_SUGGESTION_COMMAND },
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
          { text: 'index1', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index2', command: TRIGGER_SUGGESTION_COMMAND },
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
      recommendedQuerySuggestions = getRecommendedQueriesSuggestions('index1', 'dateField');

      testSuggestions(
        'FROM index1/',
        [
          { text: 'index1 | ', filterText: 'index1', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index1, ', filterText: 'index1', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index1 METADATA ', filterText: 'index1', command: TRIGGER_SUGGESTION_COMMAND },
          ...recommendedQuerySuggestions.map((q) => q.queryString),
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

      recommendedQuerySuggestions = getRecommendedQueriesSuggestions('index2', 'dateField');
      testSuggestions(
        'FROM index1, index2/',
        [
          { text: 'index2 | ', filterText: 'index2', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index2, ', filterText: 'index2', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index2 METADATA ', filterText: 'index2', command: TRIGGER_SUGGESTION_COMMAND },
          ...recommendedQuerySuggestions.map((q) => q.queryString),
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
      recommendedQuerySuggestions = getRecommendedQueriesSuggestions('foo$bar', 'dateField');
      testSuggestions(
        'FROM foo$bar/',
        [
          {
            text: 'foo$bar | ',
            filterText: 'foo$bar',
            command: TRIGGER_SUGGESTION_COMMAND,
            rangeToReplace: { start: 6, end: 13 },
          },
          {
            text: 'foo$bar, ',
            filterText: 'foo$bar',
            command: TRIGGER_SUGGESTION_COMMAND,
            rangeToReplace: { start: 6, end: 13 },
          },
          {
            text: 'foo$bar METADATA ',
            filterText: 'foo$bar',
            asSnippet: false, // important because the text includes "$"
            command: TRIGGER_SUGGESTION_COMMAND,
            rangeToReplace: { start: 6, end: 13 },
          },
          ...recommendedQuerySuggestions.map((q) => q.queryString),
        ],
        undefined,
        [, [{ name: 'foo$bar', hidden: false }]]
      );

      // This is an identifier that matches multiple sources
      recommendedQuerySuggestions = getRecommendedQueriesSuggestions('i*', 'dateField');
      testSuggestions(
        'FROM i*/',
        [
          { text: 'i* | ', filterText: 'i*', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'i*, ', filterText: 'i*', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'i* METADATA ', filterText: 'i*', command: TRIGGER_SUGGESTION_COMMAND },
          ...recommendedQuerySuggestions.map((q) => q.queryString),
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

    recommendedQuerySuggestions = getRecommendedQueriesSuggestions('', 'dateField');
    // FROM source METADATA
    testSuggestions('FROM index1 M/', [attachAsSnippet(attachTriggerCommand('METADATA $0'))]);

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
      testSuggestions(
        'FROM a | ENRICH policy /',
        ['ON $0', 'WITH $0', '| '].map(attachTriggerCommand)
      );

      testSuggestions(
        'FROM a | ENRICH policy ON /',
        getFieldNamesByType('any')
          .map((name) => `${name} `)
          .map(attachTriggerCommand)
      );
      testSuggestions(
        'FROM a | ENRICH policy ON @timestamp /',
        ['WITH $0', '| '].map(attachTriggerCommand)
      );
      // nothing fancy with this field list
      testSuggestions('FROM a | ENRICH policy ON @timestamp WITH /', [
        'var0 = ',
        ...getPolicyFields('policy').map((name) => ({ text: name, command: undefined })),
      ]);
      describe('replacement range', () => {
        testSuggestions('FROM a | ENRICH policy ON @timestamp WITH othe/', [
          'var0 = ',
          ...getPolicyFields('policy').map((name) => ({
            text: name,
            command: undefined,
            rangeToReplace: { start: 43, end: 47 },
          })),
        ]);
        testSuggestions(
          'FROM a | ENRICH policy ON @timestamp WITH var0 = othe/',
          getPolicyFields('policy').map((name) => ({
            text: name,
            command: undefined,
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
        'var0 = ',
        ...getFunctionSignaturesByReturnType('stats', 'any', {
          scalar: true,
          agg: true,
          grouping: true,
        }).map(attachAsSnippet),
      ].map(attachTriggerCommand)
    );

    // STATS argument BY
    testSuggestions('FROM a | STATS AVG(numberField) /', [
      ', ',
      attachTriggerCommand('BY '),
      attachTriggerCommand('| '),
    ]);

    // STATS argument BY field
    const allByCompatibleFunctions = getFunctionSignaturesByReturnType(
      'stats',
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
      getDateHistogramCompletionItem(),
      attachTriggerCommand('var0 = '),
      ...getFieldNamesByType('any')
        .map((field) => `${field} `)
        .map(attachTriggerCommand),
      ...allByCompatibleFunctions,
    ]);

    // STATS argument BY assignment (checking field suggestions)
    testSuggestions('FROM a | STATS AVG(numberField) BY var0 = /', [
      getDateHistogramCompletionItem(),
      ...getFieldNamesByType('any')
        .map((field) => `${field} `)
        .map(attachTriggerCommand),
      ...allByCompatibleFunctions,
    ]);

    // WHERE argument (field suggestions)
    testSuggestions('FROM a | WHERE /', [
      ...getFieldNamesByType('any')
        .map((field) => `${field} `)
        .map(attachTriggerCommand),
      ...getFunctionSignaturesByReturnType('where', 'any', { scalar: true }).map(attachAsSnippet),
    ]);

    // WHERE argument comparison
    testSuggestions(
      'FROM a | WHERE keywordField /',
      getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
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
          { filterText: '_source', text: '_source | ', command: TRIGGER_SUGGESTION_COMMAND },
          { filterText: '_source', text: '_source, ', command: TRIGGER_SUGGESTION_COMMAND },
        ]);
        // no comma if there are no more fields
        testSuggestions('FROM a METADATA _id, _ignored, _index, _source, _index_mode, _version/', [
          { filterText: '_version', text: '_version | ', command: TRIGGER_SUGGESTION_COMMAND },
        ]);
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
              rangeToReplace: { start: 15, end: 16 },
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
              rangeToReplace: { start: 15, end: 26 },
            }))
            .map(attachTriggerCommand)
        );
        testSuggestions('FROM a | KEEP doubleField /', ['| ', ',']);

        // Let's get funky with the field names
        testSuggestions(
          `FROM a | ${commandName} @timestamp/`,
          ['@timestamp, ', '@timestamp | ']
            .map((text) => ({
              text,
              filterText: '@timestamp',
              rangeToReplace: { start: 15, end: 25 },
            }))
            .map(attachTriggerCommand),
          undefined,
          [
            [
              { name: '@timestamp', type: 'date' },
              { name: 'utc_stamp', type: 'date' },
            ],
          ]
        );
        testSuggestions(
          `FROM a | ${commandName} foo.bar/`,
          ['foo.bar, ', 'foo.bar | ']
            .map((text) => ({
              text,
              filterText: 'foo.bar',
              rangeToReplace: { start: 15, end: 22 },
            }))
            .map(attachTriggerCommand),
          undefined,
          [
            [
              { name: 'foo.bar', type: 'double' },
              { name: 'baz', type: 'date' },
            ],
          ]
        );

        describe('escaped field names', () => {
          testSuggestions(
            `FROM a | ${commandName} \`foo.bar\`/`,
            ['`foo.bar`, ', '`foo.bar` | '],
            undefined,
            [
              [
                { name: 'foo.bar', type: 'double' },
                { name: 'baz', type: 'date' }, // added so that we get a comma suggestion
              ],
            ]
          );
          testSuggestions(
            `FROM a | ${commandName} \`foo\`\`\`\`bar\`\`baz\`/`,
            ['`foo````bar``baz`, ', '`foo````bar``baz` | '],
            undefined,
            [
              [
                { name: 'foo``bar`baz', type: 'double' },
                { name: 'baz', type: 'date' }, // added so that we get a comma suggestion
              ],
            ]
          );
          testSuggestions(`FROM a | ${commandName} \`any#Char$Field\`/`, [
            '`any#Char$Field`, ',
            '`any#Char$Field` | ',
          ]);
          // @todo enable this test when we can use AST to support this case
          testSuggestions.skip(
            `FROM a | ${commandName} \`foo\`.\`bar\`/`,
            ['`foo`.`bar`, ', '`foo`.`bar` | '],
            undefined,
            [[{ name: 'foo.bar', type: 'double' }]]
          );
        });

        // Subsequent fields
        testSuggestions(
          `FROM a | ${commandName} doubleField, dateFiel/`,
          getFieldNamesByType('any')
            .filter((s) => s !== 'doubleField')
            .map(attachTriggerCommand)
        );
        testSuggestions(`FROM a | ${commandName} doubleField, dateField/`, [
          'dateField, ',
          'dateField | ',
        ]);

        // out of fields
        testSuggestions(
          `FROM a | ${commandName} doubleField, dateField/`,
          ['dateField | '],
          undefined,
          [
            [
              { name: 'doubleField', type: 'double' },
              { name: 'dateField', type: 'date' },
            ],
          ]
        );
      });
    });
  });

  describe('Replacement ranges are attached when needed', () => {
    testSuggestions('FROM a | WHERE doubleField IS NOT N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 28, end: 36 } },
      { text: 'IS NULL', rangeToReplace: { start: 35, end: 35 } },
      '!= $0',
      '== $0',
      'IN $0',
      'AND $0',
      'NOT',
      'OR $0',
      // pipe doesn't make sense here, but Monaco will filter it out.
      // see https://github.com/elastic/kibana/issues/199401 for an explanation
      // of why this happens
      '| ',
    ]);
    testSuggestions('FROM a | WHERE doubleField IS N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 28, end: 32 } },
      { text: 'IS NULL', rangeToReplace: { start: 28, end: 32 } },
      { text: '!= $0', rangeToReplace: { start: 31, end: 31 } },
      '== $0',
      'IN $0',
      'AND $0',
      'NOT',
      'OR $0',
      // pipe doesn't make sense here, but Monaco will filter it out.
      // see https://github.com/elastic/kibana/issues/199401 for an explanation
      // of why this happens
      '| ',
    ]);
    testSuggestions('FROM a | EVAL doubleField IS NOT N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 27, end: 35 } },
      'IS NULL',
      '!= $0',
      '== $0',
      'IN $0',
      'AND $0',
      'NOT',
      'OR $0',
    ]);

    describe('dot-separated field names', () => {
      testSuggestions(
        'FROM a | KEEP field.nam/',
        [{ text: 'field.name', rangeToReplace: { start: 15, end: 24 } }],
        undefined,
        [[{ name: 'field.name', type: 'double' }]]
      );
      // multi-line
      testSuggestions(
        'FROM a\n| KEEP field.nam/',
        [{ text: 'field.name', rangeToReplace: { start: 15, end: 24 } }],
        undefined,
        [[{ name: 'field.name', type: 'double' }]]
      );
      // triple separator
      testSuggestions(
        'FROM a\n| KEEP field.name.f/',
        [{ text: 'field.name.foo', rangeToReplace: { start: 15, end: 27 } }],
        undefined,
        [[{ name: 'field.name.foo', type: 'double' }]]
      );
      // whitespace — we can't support this case yet because
      // we are relying on string checking instead of the AST :(
      testSuggestions.skip(
        'FROM a | KEEP field . n/',
        [{ text: 'field . name', rangeToReplace: { start: 15, end: 23 } }],
        undefined,
        [[{ name: 'field.name', type: 'double' }]]
      );
    });
  });
});
