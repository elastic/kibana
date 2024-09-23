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
import {
  getAddDateHistogramSnippet,
  getDateLiterals,
  getSafeInsertText,
  TIME_SYSTEM_PARAMS,
  TRIGGER_SUGGESTION_COMMAND,
} from './factories';
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
} from './__tests__/helpers';
import { METADATA_FIELDS } from '../shared/constants';
import { ESQL_COMMON_NUMERIC_TYPES, ESQL_STRING_TYPES } from '../shared/esql_types';
import { log10ParameterTypes, powParameterTypes } from './__tests__/constants';

const commandDefinitions = unmodifiedCommandDefinitions.filter(({ hidden }) => !hidden);
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
    testSuggestions(
      '/',
      sourceCommands.map((name) => name.toUpperCase() + ' $0')
    );
    testSuggestions(
      'from a | /',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );
    testSuggestions(
      'from a [metadata _id] | /',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );
    testSuggestions(
      'from a | eval var0 = a | /',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );
    testSuggestions(
      'from a [metadata _id] | eval var0 = a | /',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );
  });

  describe('show', () => {
    testSuggestions('show /', ['INFO']);
    for (const fn of ['info']) {
      testSuggestions(`show ${fn} /`, ['| ']);
    }
  });

  describe('where', () => {
    const allEvalFns = getFunctionSignaturesByReturnType('where', 'any', {
      scalar: true,
    });
    testSuggestions('from a | where /', [
      ...getFieldNamesByType('any').map((field) => `${field} `),
      ...allEvalFns,
    ]);
    testSuggestions('from a | eval var0 = 1 | where /', [
      ...getFieldNamesByType('any').map((name) => `${name} `),
      'var0',
      ...allEvalFns,
    ]);
    testSuggestions('from a | where keywordField /', [
      // all functions compatible with a keywordField type
      ...getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
        },
        undefined,
        ['and', 'or', 'not']
      ),
    ]);

    const expectedComparisonWithDateSuggestions = [
      ...getDateLiterals(),
      ...getFieldNamesByType(['date']),
      // all functions compatible with a keywordField type
      ...getFunctionSignaturesByReturnType('where', ['date'], { scalar: true }),
    ];
    testSuggestions('from a | where dateField == /', expectedComparisonWithDateSuggestions);

    testSuggestions('from a | where dateField < /', expectedComparisonWithDateSuggestions);

    testSuggestions('from a | where dateField >= /', expectedComparisonWithDateSuggestions);

    const expectedComparisonWithTextFieldSuggestions = [
      ...getFieldNamesByType(['text', 'keyword', 'ip', 'version']),
      ...getFunctionSignaturesByReturnType('where', ['text', 'keyword', 'ip', 'version'], {
        scalar: true,
      }),
    ];
    testSuggestions('from a | where textField >= /', expectedComparisonWithTextFieldSuggestions);
    testSuggestions(
      'from a | where textField >= textField/',
      expectedComparisonWithTextFieldSuggestions
    );
    for (const op of ['and', 'or']) {
      testSuggestions(`from a | where keywordField >= keywordField ${op} /`, [
        ...getFieldNamesByType('any'),
        ...getFunctionSignaturesByReturnType('where', 'any', { scalar: true }),
      ]);
      testSuggestions(`from a | where keywordField >= keywordField ${op} doubleField /`, [
        ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['double']),
      ]);
      testSuggestions(`from a | where keywordField >= keywordField ${op} doubleField == /`, [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType('where', ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);
    }
    testSuggestions('from a | stats a=avg(doubleField) | where a /', [
      ...getFunctionSignaturesByReturnType('where', 'any', { builtin: true, skipAssign: true }, [
        'double',
      ]),
    ]);
    // Mind this test: suggestion is aware of previous commands when checking for fields
    // in this case the doubleField has been wiped by the STATS command and suggest cannot find it's type
    // @TODO: verify this is the correct behaviour in this case or if we want a "generic" suggestion anyway
    testSuggestions(
      'from a | stats a=avg(doubleField) | where doubleField /',
      [],
      undefined,
      // make the fields suggest aware of the previous STATS, leave the other callbacks untouched
      [[{ name: 'a', type: 'double' }], undefined, undefined]
    );
    // The editor automatically inject the final bracket, so it is not useful to test with just open bracket
    testSuggestions(
      'from a | where log10(/)',
      [
        ...getFieldNamesByType(log10ParameterTypes),
        ...getFunctionSignaturesByReturnType(
          'where',
          log10ParameterTypes,
          { scalar: true },
          undefined,
          ['log10']
        ),
      ],
      '('
    );
    testSuggestions('from a | where log10(doubleField) /', [
      ...getFunctionSignaturesByReturnType('where', 'double', { builtin: true }, ['double']),
      ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['double']),
    ]);
    testSuggestions(
      'from a | WHERE pow(doubleField, /)',
      [
        ...getFieldNamesByType(powParameterTypes),
        ...getFunctionSignaturesByReturnType(
          'where',
          powParameterTypes,
          { scalar: true },
          undefined,
          ['pow']
        ),
      ],
      ','
    );

    testSuggestions('from index | WHERE keywordField not /', ['LIKE $0', 'RLIKE $0', 'IN $0']);
    testSuggestions('from index | WHERE keywordField NOT /', ['LIKE $0', 'RLIKE $0', 'IN $0']);
    testSuggestions('from index | WHERE not /', [
      ...getFieldNamesByType('boolean'),
      ...getFunctionSignaturesByReturnType('eval', 'boolean', { scalar: true }),
    ]);
    testSuggestions('from index | WHERE doubleField in /', ['( $0 )']);
    testSuggestions('from index | WHERE doubleField not in /', ['( $0 )']);
    testSuggestions(
      'from index | WHERE doubleField not in (/)',
      [
        ...getFieldNamesByType('double').filter((name) => name !== 'doubleField'),
        ...getFunctionSignaturesByReturnType('where', 'double', { scalar: true }),
      ],
      '('
    );
    testSuggestions('from index | WHERE doubleField in ( `any#Char$Field`, /)', [
      ...getFieldNamesByType('double').filter(
        (name) => name !== '`any#Char$Field`' && name !== 'doubleField'
      ),
      ...getFunctionSignaturesByReturnType('where', 'double', { scalar: true }),
    ]);
    testSuggestions('from index | WHERE doubleField not in ( `any#Char$Field`, /)', [
      ...getFieldNamesByType('double').filter(
        (name) => name !== '`any#Char$Field`' && name !== 'doubleField'
      ),
      ...getFunctionSignaturesByReturnType('where', 'double', { scalar: true }),
    ]);
  });

  describe('grok', () => {
    const constantPattern = '"%{WORD:firstWord}"';
    const subExpressions = [
      '',
      `grok keywordField |`,
      `grok keywordField ${constantPattern} |`,
      `dissect keywordField ${constantPattern} append_separator = ":" |`,
      `dissect keywordField ${constantPattern} |`,
    ];
    for (const subExpression of subExpressions) {
      testSuggestions(
        `from a | ${subExpression} grok /`,
        getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
      );
      testSuggestions(`from a | ${subExpression} grok keywordField /`, [constantPattern], ' ');
      testSuggestions(`from a | ${subExpression} grok keywordField ${constantPattern} /`, ['| ']);
    }

    testSuggestions(
      'from a | grok /',
      getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
    );
    testSuggestions(
      'from a | grok key/',
      getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
    );
    testSuggestions('from a | grok keywordField/', []);
  });

  describe('dissect', () => {
    const constantPattern = '"%{firstWord}"';
    const subExpressions = [
      '',
      `dissect keywordField |`,
      `dissect keywordField ${constantPattern} |`,
      `dissect keywordField ${constantPattern} append_separator = ":" |`,
    ];
    for (const subExpression of subExpressions) {
      testSuggestions(
        `from a | ${subExpression} dissect /`,
        getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
      );
      testSuggestions(`from a | ${subExpression} dissect keywordField /`, [constantPattern], ' ');
      testSuggestions(
        `from a | ${subExpression} dissect keywordField ${constantPattern} /`,
        ['APPEND_SEPARATOR = $0', '| '],
        ' '
      );
      testSuggestions(
        `from a | ${subExpression} dissect keywordField ${constantPattern} append_separator = /`,
        ['":"', '";"']
      );
      testSuggestions(
        `from a | ${subExpression} dissect keywordField ${constantPattern} append_separator = ":" /`,
        ['| ']
      );
    }

    testSuggestions(
      'from a | dissect /',
      getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
    );
    testSuggestions(
      'from a | dissect key/',
      getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
    );
    testSuggestions('from a | dissect keywordField/', []);
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
        ]
      );
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
    testSuggestions('FROM "i/"', ['index'], undefined, [, [{ name: 'index', hidden: false }]]);
    testSuggestions('FROM "index/"', ['index'], undefined, [, [{ name: 'index', hidden: false }]]);
    // TODO — re-enable these tests when we can support this case
    testSuggestions.skip('FROM "  a/"', []);
    testSuggestions.skip('FROM "foo b/"', []);
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
    it('should send the fields query without the last command', async () => {
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
      expect(callbackMocks.getFieldsFor).toHaveBeenCalledWith({
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
      expect(callbackMocks.getFieldsFor).toHaveBeenCalledWith({ query: 'from a' });
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
    testSuggestions(
      'f/',
      sourceCommands.map((cmd) => `${cmd.toUpperCase()} $0`)
    );

    // pipe command
    testSuggestions(
      'FROM k | E/',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );

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
        ...getFieldNamesByType('date').map((name) => `${name}, `),
        ...getFunctionSignaturesByReturnType('eval', 'date', { scalar: true }).map((s) => ({
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
    testSuggestions('FROM index1 M/', [',', 'METADATA $0', '| ']);

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
      ...getFunctionSignaturesByReturnType('stats', 'any', { scalar: true, agg: true }),
    ]);

    // STATS argument BY
    testSuggestions('FROM index1 | STATS AVG(booleanField) B/', ['BY $0', ',', '| ']);

    // STATS argument BY expression
    testSuggestions('FROM index1 | STATS field BY f/', [
      'var0 = ',
      getAddDateHistogramSnippet(),
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
  });

  describe('advancing the cursor and opening the suggestion menu automatically ✨', () => {
    /**
     * NOTE: Monaco uses an Invoke trigger kind when the show suggestions action is triggered (e.g. accepting the "FROM" suggestion)
     */

    const attachTriggerCommand = (
      s: string | PartialSuggestionWithText
    ): PartialSuggestionWithText =>
      typeof s === 'string'
        ? {
            text: s,
            command: TRIGGER_SUGGESTION_COMMAND,
          }
        : { ...s, command: TRIGGER_SUGGESTION_COMMAND };

    const attachAsSnippet = (s: PartialSuggestionWithText): PartialSuggestionWithText => ({
      ...s,
      asSnippet: true,
    });

    // Source command
    testSuggestions(
      'F/',
      ['FROM $0', 'ROW $0', 'SHOW $0'].map(attachTriggerCommand).map(attachAsSnippet)
    );

    // Pipe command
    testSuggestions(
      'FROM a | E/',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => attachTriggerCommand(name.toUpperCase() + ' $0'))
        .map(attachAsSnippet) // TODO consider making this check more fundamental
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

    // PIPE (|)
    testSuggestions('FROM a /', [
      attachTriggerCommand('| '),
      ',',
      attachAsSnippet(attachTriggerCommand('METADATA $0')),
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

      testSuggestions(
        'FROM index1/',
        [
          { text: 'index1 | ', filterText: 'index1', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index1, ', filterText: 'index1', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index1 METADATA ', filterText: 'index1', command: TRIGGER_SUGGESTION_COMMAND },
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
        'FROM index1, index2/',
        [
          { text: 'index2 | ', filterText: 'index2', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index2, ', filterText: 'index2', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'index2 METADATA ', filterText: 'index2', command: TRIGGER_SUGGESTION_COMMAND },
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
        ],
        undefined,
        [, [{ name: 'foo$bar', hidden: false }]]
      );

      // This is an identifier that matches multiple sources
      testSuggestions(
        'FROM i*/',
        [
          { text: 'i* | ', filterText: 'i*', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'i*, ', filterText: 'i*', command: TRIGGER_SUGGESTION_COMMAND },
          { text: 'i* METADATA ', filterText: 'i*', command: TRIGGER_SUGGESTION_COMMAND },
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

    // FROM source METADATA
    testSuggestions('FROM index1 M/', [
      ',',
      attachAsSnippet(attachTriggerCommand('METADATA $0')),
      '| ',
    ]);

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
        ...getFunctionSignaturesByReturnType('stats', 'any', { scalar: true, agg: true }).map(
          attachAsSnippet
        ),
      ].map(attachTriggerCommand)
    );

    // STATS argument BY
    testSuggestions('FROM a | STATS AVG(numberField) /', [
      ',',
      attachAsSnippet(attachTriggerCommand('BY $0')),
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
      getAddDateHistogramSnippet(),
      attachTriggerCommand('var0 = '),
      ...getFieldNamesByType('any')
        .map((field) => `${field} `)
        .map(attachTriggerCommand),
      ...allByCompatibleFunctions,
    ]);

    // STATS argument BY assignment (checking field suggestions)
    testSuggestions('FROM a | STATS AVG(numberField) BY var0 = /', [
      getAddDateHistogramSnippet(),
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
        testSuggestions('FROM a METADATA _id, _ignored, _index, _source, _version/', [
          { filterText: '_version', text: '_version | ', command: TRIGGER_SUGGESTION_COMMAND },
        ]);
      });

      describe('KEEP <field>', () => {
        // KEEP field
        testSuggestions('FROM a | KEEP /', getFieldNamesByType('any').map(attachTriggerCommand));
        testSuggestions(
          'FROM a | KEEP d/',
          getFieldNamesByType('any')
            .map<PartialSuggestionWithText>((text) => ({
              text,
              rangeToReplace: { start: 15, end: 16 },
            }))
            .map(attachTriggerCommand)
        );
        testSuggestions(
          'FROM a | KEEP doubleFiel/',
          getFieldNamesByType('any').map(attachTriggerCommand)
        );
        testSuggestions(
          'FROM a | KEEP doubleField/',
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
          'FROM a | KEEP @timestamp/',
          ['@timestamp, ', '@timestamp | ']
            .map((text) => ({
              text,
              filterText: '@timestamp',
              rangeToReplace: { start: 15, end: 25 },
            }))
            .map(attachTriggerCommand),
          undefined,
          [[{ name: '@timestamp', type: 'date' }]]
        );
        testSuggestions(
          'FROM a | KEEP foo.bar/',
          ['foo.bar, ', 'foo.bar | ']
            .map((text) => ({
              text,
              filterText: 'foo.bar',
              rangeToReplace: { start: 15, end: 22 },
            }))
            .map(attachTriggerCommand),
          undefined,
          [[{ name: 'foo.bar', type: 'double' }]]
        );

        describe('escaped field names', () => {
          // This isn't actually the behavior we want, but this test is here
          // to make sure no weird suggestions start cropping up in this case.
          testSuggestions('FROM a | KEEP `foo.bar`/', ['foo.bar'], undefined, [
            [{ name: 'foo.bar', type: 'double' }],
          ]);
          // @todo re-enable these tests when we can use AST to support this case
          testSuggestions.skip('FROM a | KEEP `foo.bar`/', ['foo.bar, ', 'foo.bar | '], undefined, [
            [{ name: 'foo.bar', type: 'double' }],
          ]);
          testSuggestions.skip(
            'FROM a | KEEP `foo`.`bar`/',
            ['foo.bar, ', 'foo.bar | '],
            undefined,
            [[{ name: 'foo.bar', type: 'double' }]]
          );
          testSuggestions.skip('FROM a | KEEP `any#Char$Field`/', [
            '`any#Char$Field`, ',
            '`any#Char$Field` | ',
          ]);
        });

        // Subsequent fields
        testSuggestions(
          'FROM a | KEEP doubleField, dateFiel/',
          getFieldNamesByType('any')
            .filter((s) => s !== 'doubleField')
            .map(attachTriggerCommand)
        );
        testSuggestions('FROM a | KEEP doubleField, dateField/', ['dateField, ', 'dateField | ']);
      });
    });
  });

  describe('Replacement ranges are attached when needed', () => {
    testSuggestions('FROM a | WHERE doubleField IS NOT N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 28, end: 35 } },
      { text: 'IS NULL', rangeToReplace: { start: 35, end: 35 } },
      '!= $0',
      '< $0',
      '<= $0',
      '== $0',
      '> $0',
      '>= $0',
      'IN $0',
    ]);
    testSuggestions('FROM a | WHERE doubleField IS N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 28, end: 31 } },
      { text: 'IS NULL', rangeToReplace: { start: 28, end: 31 } },
      { text: '!= $0', rangeToReplace: { start: 31, end: 31 } },
      '< $0',
      '<= $0',
      '== $0',
      '> $0',
      '>= $0',
      'IN $0',
    ]);
    testSuggestions('FROM a | EVAL doubleField IS NOT N/', [
      { text: 'IS NOT NULL', rangeToReplace: { start: 27, end: 34 } },
      'IS NULL',
      '% $0',
      '* $0',
      '+ $0',
      '- $0',
      '/ $0',
      '!= $0',
      '< $0',
      '<= $0',
      '== $0',
      '> $0',
      '>= $0',
      'IN $0',
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
