/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { suggest } from './autocomplete';
import { evalFunctionDefinitions } from '../definitions/functions';
import { timeUnitsToSuggest } from '../definitions/literals';
import { commandDefinitions } from '../definitions/commands';
import {
  getSafeInsertText,
  getUnitDuration,
  TRIGGER_SUGGESTION_COMMAND,
  TIME_SYSTEM_PARAMS,
} from './factories';
import { camelCase, partition } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { FunctionParameter } from '../definitions/types';
import { getParamAtPosition } from './helper';
import { nonNullable } from '../shared/helpers';
import {
  policies,
  getFunctionSignaturesByReturnType,
  getFieldNamesByType,
  getLiteralsByType,
  getDateLiteralsByFieldType,
  createCustomCallbackMocks,
  createCompletionContext,
  getPolicyFields,
  PartialSuggestionWithText,
  TIME_PICKER_SUGGESTION,
} from './__tests__/helpers';
import { METADATA_FIELDS } from '../shared/constants';

describe('autocomplete', () => {
  type TestArgs = [
    string,
    Array<string | PartialSuggestionWithText>,
    string?,
    number?,
    Parameters<typeof createCustomCallbackMocks>?
  ];

  const _testSuggestionsFn = (
    { only, skip }: { only?: boolean; skip?: boolean } = {},
    statement: string,
    expected: Array<string | PartialSuggestionWithText>,
    triggerCharacter?: string,
    _offset?: number,
    customCallbacksArgs: Parameters<typeof createCustomCallbackMocks> = [
      undefined,
      undefined,
      undefined,
    ]
  ) => {
    const context = createCompletionContext(triggerCharacter);
    const testFn = only ? test.only : skip ? test.skip : test;
    const offset = _offset
      ? _offset
      : triggerCharacter
      ? statement.lastIndexOf(triggerCharacter) + 1
      : statement.length;

    testFn(statement, async () => {
      const callbackMocks = createCustomCallbackMocks(...customCallbacksArgs);
      const suggestions = await suggest(
        statement,
        offset,
        context,
        async (text) => (text ? getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
        callbackMocks
      );

      const sortedSuggestionTexts = suggestions.map((suggestion) => suggestion.text).sort();
      const sortedExpectedTexts = expected
        .map((suggestion) => (typeof suggestion === 'string' ? suggestion : suggestion.text ?? ''))
        .sort();

      expect(sortedSuggestionTexts).toEqual(sortedExpectedTexts);
      const expectedNonStringSuggestions = expected.filter(
        (suggestion) => typeof suggestion !== 'string'
      ) as PartialSuggestionWithText[];

      for (const expectedSuggestion of expectedNonStringSuggestions) {
        const suggestion = suggestions.find((s) => s.text === expectedSuggestion.text);
        expect(suggestion).toEqual(expect.objectContaining(expectedSuggestion));
      }
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

  const sourceCommands = ['row', 'from', 'show'];

  describe('New command', () => {
    testSuggestions(
      ' ',
      sourceCommands.map((name) => name.toUpperCase() + ' $0')
    );
    testSuggestions(
      'from a | ',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );
    testSuggestions(
      'from a [metadata _id] | ',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );
    testSuggestions(
      'from a | eval var0 = a | ',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );
    testSuggestions(
      'from a [metadata _id] | eval var0 = a | ',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0')
    );
  });

  describe('show', () => {
    testSuggestions('show ', ['INFO']);
    for (const fn of ['info']) {
      testSuggestions(`show ${fn} `, ['|']);
    }
  });

  describe('where', () => {
    const allEvalFns = getFunctionSignaturesByReturnType('where', 'any', {
      scalar: true,
    });
    testSuggestions('from a | where ', [...getFieldNamesByType('any'), ...allEvalFns]);
    testSuggestions('from a | eval var0 = 1 | where ', [
      ...getFieldNamesByType('any'),
      'var0',
      ...allEvalFns,
    ]);
    testSuggestions('from a | where stringField ', [
      // all functions compatible with a stringField type
      ...getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
        },
        ['string']
      ),
    ]);
    testSuggestions('from a | where stringField >= ', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('where', 'string', { scalar: true }),
    ]);
    // Skip these tests until the insensitive case equality gets restored back
    testSuggestions.skip('from a | where stringField =~ ', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('where', 'string', { scalar: true }),
    ]);
    testSuggestions('from a | where stringField >= stringField ', [
      '|',
      ...getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
        },
        ['boolean']
      ),
    ]);
    testSuggestions.skip('from a | where stringField =~ stringField ', [
      '|',
      ...getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
        },
        ['boolean']
      ),
    ]);
    for (const op of ['and', 'or']) {
      testSuggestions(`from a | where stringField >= stringField ${op} `, [
        ...getFieldNamesByType('any'),
        ...getFunctionSignaturesByReturnType('where', 'any', { scalar: true }),
      ]);
      testSuggestions(`from a | where stringField >= stringField ${op} numberField `, [
        ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['number']),
      ]);
      testSuggestions(`from a | where stringField >= stringField ${op} numberField == `, [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('where', 'number', { scalar: true }),
      ]);
    }
    testSuggestions('from a | stats a=avg(numberField) | where a ', [
      ...getFunctionSignaturesByReturnType('where', 'any', { builtin: true, skipAssign: true }, [
        'number',
      ]),
    ]);
    // Mind this test: suggestion is aware of previous commands when checking for fields
    // in this case the numberField has been wiped by the STATS command and suggest cannot find it's type
    // @TODO: verify this is the correct behaviour in this case or if we want a "generic" suggestion anyway
    testSuggestions(
      'from a | stats a=avg(numberField) | where numberField ',
      [],
      undefined,
      undefined,
      // make the fields suggest aware of the previous STATS, leave the other callbacks untouched
      [[{ name: 'a', type: 'number' }], undefined, undefined]
    );
    // The editor automatically inject the final bracket, so it is not useful to test with just open bracket
    testSuggestions(
      'from a | where log10()',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('where', 'number', { scalar: true }, undefined, [
          'log10',
        ]),
      ],
      '('
    );
    testSuggestions('from a | where log10(numberField) ', [
      ...getFunctionSignaturesByReturnType('where', 'number', { builtin: true }, ['number']),
      ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['number']),
    ]);
    testSuggestions(
      'from a | WHERE pow(numberField, )',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('where', 'number', { scalar: true }, undefined, [
          'pow',
        ]),
      ],
      ','
    );

    testSuggestions('from index | WHERE stringField not ', ['LIKE $0', 'RLIKE $0', 'IN $0']);
    testSuggestions('from index | WHERE stringField NOT ', ['LIKE $0', 'RLIKE $0', 'IN $0']);
    testSuggestions('from index | WHERE not ', [
      ...getFieldNamesByType('boolean'),
      ...getFunctionSignaturesByReturnType('eval', 'boolean', { scalar: true }),
    ]);
    testSuggestions('from index | WHERE numberField in ', ['( $0 )']);
    testSuggestions('from index | WHERE numberField not in ', ['( $0 )']);
    testSuggestions(
      'from index | WHERE numberField not in ( )',
      [
        ...getFieldNamesByType('number').filter((name) => name !== 'numberField'),
        ...getFunctionSignaturesByReturnType('where', 'number', { scalar: true }),
      ],
      '('
    );
    testSuggestions(
      'from index | WHERE numberField in ( `any#Char$Field`, )',
      [
        ...getFieldNamesByType('number').filter(
          (name) => name !== '`any#Char$Field`' && name !== 'numberField'
        ),
        ...getFunctionSignaturesByReturnType('where', 'number', { scalar: true }),
      ],
      undefined,
      54 // after the first suggestions
    );
    testSuggestions(
      'from index | WHERE numberField not in ( `any#Char$Field`, )',
      [
        ...getFieldNamesByType('number').filter(
          (name) => name !== '`any#Char$Field`' && name !== 'numberField'
        ),
        ...getFunctionSignaturesByReturnType('where', 'number', { scalar: true }),
      ],
      undefined,
      58 // after the first suggestions
    );
  });

  describe('grok', () => {
    const constantPattern = '"%{WORD:firstWord}"';
    const subExpressions = [
      '',
      `grok stringField |`,
      `grok stringField ${constantPattern} |`,
      `dissect stringField ${constantPattern} append_separator = ":" |`,
      `dissect stringField ${constantPattern} |`,
    ];
    for (const subExpression of subExpressions) {
      testSuggestions(`from a | ${subExpression} grok `, getFieldNamesByType('string'));
      testSuggestions(`from a | ${subExpression} grok stringField `, [constantPattern], ' ');
      testSuggestions(`from a | ${subExpression} grok stringField ${constantPattern} `, ['|']);
    }
  });

  describe('dissect', () => {
    const constantPattern = '"%{firstWord}"';
    const subExpressions = [
      '',
      `dissect stringField |`,
      `dissect stringField ${constantPattern} |`,
      `dissect stringField ${constantPattern} append_separator = ":" |`,
    ];
    for (const subExpression of subExpressions) {
      testSuggestions(`from a | ${subExpression} dissect `, getFieldNamesByType('string'));
      testSuggestions(`from a | ${subExpression} dissect stringField `, [constantPattern], ' ');
      testSuggestions(
        `from a | ${subExpression} dissect stringField ${constantPattern} `,
        ['APPEND_SEPARATOR = $0', '|'],
        ' '
      );
      testSuggestions(
        `from a | ${subExpression} dissect stringField ${constantPattern} append_separator = `,
        ['":"', '";"']
      );
      testSuggestions(
        `from a | ${subExpression} dissect stringField ${constantPattern} append_separator = ":" `,
        ['|']
      );
    }
  });

  describe('sort', () => {
    testSuggestions('from a | sort ', [
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType('sort', 'any', { scalar: true }),
    ]);
    testSuggestions('from a | sort stringField ', ['ASC', 'DESC', ',', '|']);
    testSuggestions('from a | sort stringField desc ', ['NULLS FIRST', 'NULLS LAST', ',', '|']);
    // @TODO: improve here
    // testSuggestions('from a | sort stringField desc ', ['first', 'last']);
  });

  describe('limit', () => {
    testSuggestions('from a | limit ', ['10', '100', '1000']);
    testSuggestions('from a | limit 4 ', ['|']);
  });

  describe('mv_expand', () => {
    testSuggestions('from a | mv_expand ', getFieldNamesByType('any'));
    testSuggestions('from a | mv_expand a ', ['|']);
  });

  describe('rename', () => {
    testSuggestions('from a | rename ', getFieldNamesByType('any'));
    testSuggestions('from a | rename stringField ', ['AS $0'], ' ');
    testSuggestions('from a | rename stringField as ', ['var0']);
  });

  for (const command of ['keep', 'drop']) {
    describe(command, () => {
      testSuggestions(`from a | ${command} `, getFieldNamesByType('any'));
      testSuggestions(
        `from a | ${command} stringField, `,
        getFieldNamesByType('any').filter((name) => name !== 'stringField')
      );

      testSuggestions(
        `from a | ${command} stringField,`,
        getFieldNamesByType('any').filter((name) => name !== 'stringField'),
        ','
      );

      testSuggestions(
        `from a_index | eval round(numberField) + 1 | eval \`round(numberField) + 1\` + 1 | eval \`\`\`round(numberField) + 1\`\` + 1\` + 1 | eval \`\`\`\`\`\`\`round(numberField) + 1\`\`\`\` + 1\`\` + 1\` + 1 | eval \`\`\`\`\`\`\`\`\`\`\`\`\`\`\`round(numberField) + 1\`\`\`\`\`\`\`\` + 1\`\`\`\` + 1\`\` + 1\` + 1 | ${command} `,
        [
          ...getFieldNamesByType('any'),
          '`round(numberField) + 1`',
          '```round(numberField) + 1`` + 1`',
          '```````round(numberField) + 1```` + 1`` + 1`',
          '```````````````round(numberField) + 1```````` + 1```` + 1`` + 1`',
          '```````````````````````````````round(numberField) + 1```````````````` + 1```````` + 1```` + 1`` + 1`',
        ]
      );
    });
  }

  describe('enrich', () => {
    const modes = ['any', 'coordinator', 'remote'];
    const policyNames = policies.map(({ name, suggestedAs }) => suggestedAs || name);
    for (const prevCommand of [
      '',
      // '| enrich other-policy ',
      // '| enrich other-policy on b ',
      // '| enrich other-policy with c ',
    ]) {
      testSuggestions(`from a ${prevCommand}| enrich `, policyNames);
      testSuggestions(
        `from a ${prevCommand}| enrich _`,
        modes.map((mode) => `_${mode}:$0`),
        '_'
      );
      for (const mode of modes) {
        testSuggestions(`from a ${prevCommand}| enrich _${mode}:`, policyNames, ':');
        testSuggestions(`from a ${prevCommand}| enrich _${mode.toUpperCase()}:`, policyNames, ':');
        testSuggestions(`from a ${prevCommand}| enrich _${camelCase(mode)}:`, policyNames, ':');
      }
      testSuggestions(`from a ${prevCommand}| enrich policy `, ['ON $0', 'WITH $0', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on `, [
        'stringField',
        'numberField',
        'dateField',
        'booleanField',
        'ipField',
        'geoPointField',
        'geoShapeField',
        'cartesianPointField',
        'cartesianShapeField',
        '`any#Char$Field`',
        'kubernetes.something.something',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b `, ['WITH $0', ',', '|']);
      testSuggestions(
        `from a ${prevCommand}| enrich policy on b with `,
        ['var0 =', ...getPolicyFields('policy')],
        ' '
      );
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 `, ['= $0', ',', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = `, [
        ...getPolicyFields('policy'),
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = stringField `, [
        ',',
        '|',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = stringField, `, [
        'var1 =',
        ...getPolicyFields('policy'),
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = stringField, var1 `, [
        '= $0',
        ',',
        '|',
      ]);
      testSuggestions(
        `from a ${prevCommand}| enrich policy on b with var0 = stringField, var1 = `,
        [...getPolicyFields('policy')]
      );
      testSuggestions(
        `from a ${prevCommand}| enrich policy with `,
        ['var0 =', ...getPolicyFields('policy')],
        ' '
      );
      testSuggestions(`from a ${prevCommand}| enrich policy with stringField `, ['= $0', ',', '|']);
    }
  });

  describe('eval', () => {
    testSuggestions('from a | eval ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);
    testSuggestions('from a | eval numberField ', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
        'number',
      ]),
      ',',
      '|',
    ]);
    testSuggestions('from index | EVAL stringField not ', ['LIKE $0', 'RLIKE $0', 'IN $0']);
    testSuggestions('from index | EVAL stringField NOT ', ['LIKE $0', 'RLIKE $0', 'IN $0']);
    testSuggestions('from index | EVAL numberField in ', ['( $0 )']);
    testSuggestions(
      'from index | EVAL numberField in ( )',
      [
        ...getFieldNamesByType('number').filter((name) => name !== 'numberField'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }),
      ],
      '('
    );
    testSuggestions('from index | EVAL numberField not in ', ['( $0 )']);
    testSuggestions('from index | EVAL not ', [
      ...getFieldNamesByType('boolean'),
      ...getFunctionSignaturesByReturnType('eval', 'boolean', { scalar: true }),
    ]);
    testSuggestions('from a | eval a=', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);
    testSuggestions('from a | eval a=abs(numberField), b= ', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);
    testSuggestions('from a | eval a=numberField, ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      'a',
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);
    // Skip this test until the insensitive case equality gets restored back
    testSuggestions.skip('from a | eval a=stringField =~ ', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('eval', 'string', { scalar: true }),
    ]);
    testSuggestions(
      'from a | eval a=round()',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }, undefined, [
          'round',
        ]),
      ],
      '('
    );
    testSuggestions(
      'from a | eval a=raund()', // note the typo in round
      [],
      '('
    );
    testSuggestions(
      'from a | eval a=raund(', // note the typo in round
      []
    );
    testSuggestions(
      'from a | eval raund(', // note the typo in round
      []
    );
    testSuggestions(
      'from a | eval raund(5, ', // note the typo in round
      [],
      ' '
    );
    testSuggestions(
      'from a | eval var0 = raund(5, ', // note the typo in round
      [],
      ' '
    );
    testSuggestions('from a | eval a=round(numberField) ', [
      ',',
      '|',
      ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
        'number',
      ]),
    ]);
    testSuggestions(
      'from a | eval a=round(numberField, ',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }, undefined, [
          'round',
        ]),
      ],
      ' '
    );
    testSuggestions(
      'from a | eval round(numberField, ',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }, undefined, [
          'round',
        ]),
      ],
      ' '
    );
    testSuggestions('from a | eval a=round(numberField),', [
      'var0 =',
      ...getFieldNamesByType('any'),
      'a',
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);
    testSuggestions('from a | eval a=round(numberField) + ', [
      ...getFieldNamesByType('number'),
      'a', // @TODO remove this
      ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }),
    ]);
    testSuggestions('from a | eval a=round(numberField)+ ', [
      ...getFieldNamesByType('number'),
      'a', // @TODO remove this
      ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }),
    ]);
    testSuggestions('from a | eval a=numberField+ ', [
      ...getFieldNamesByType('number'),
      'a', // @TODO remove this
      ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }),
    ]);
    testSuggestions('from a | eval a=`any#Char$Field`+ ', [
      ...getFieldNamesByType('number'),
      'a', // @TODO remove this
      ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }),
    ]);
    testSuggestions(
      'from a | stats avg(numberField) by stringField | eval ',
      [
        'var0 =',
        '`avg(numberField)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      ' ',
      undefined,
      // make aware EVAL of the previous STATS command
      [[], undefined, undefined]
    );
    testSuggestions(
      'from a | eval abs(numberField) + 1 | eval ',
      [
        'var0 =',
        ...getFieldNamesByType('any'),
        '`abs(numberField) + 1`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      ' '
    );
    testSuggestions(
      'from a | stats avg(numberField) by stringField | eval ',
      [
        'var0 =',
        '`avg(numberField)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      ' ',
      undefined,
      // make aware EVAL of the previous STATS command with the buggy field name from expression
      [[{ name: 'avg_numberField_', type: 'number' }], undefined, undefined]
    );
    testSuggestions(
      'from a | stats avg(numberField), avg(kubernetes.something.something) by stringField | eval ',
      [
        'var0 =',
        '`avg(numberField)`',
        '`avg(kubernetes.something.something)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      ' ',
      undefined,
      // make aware EVAL of the previous STATS command with the buggy field name from expression
      [
        [
          { name: 'avg_numberField_', type: 'number' },
          { name: 'avg_kubernetes.something.something_', type: 'number' },
        ],
        undefined,
        undefined,
      ]
    );
    testSuggestions(
      'from a | eval a=round(numberField), b=round()',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }, undefined, [
          'round',
        ]),
      ],
      '('
    );
    // test that comma is correctly added to the suggestions if minParams is not reached yet
    testSuggestions('from a | eval a=concat( ', [
      ...getFieldNamesByType('string').map((v) => `${v},`),
      ...getFunctionSignaturesByReturnType('eval', 'string', { scalar: true }, undefined, [
        'concat',
      ]).map((v) => ({ ...v, text: `${v.text},` })),
    ]);
    testSuggestions(
      'from a | eval a=concat(stringField, ',
      [
        ...getFieldNamesByType('string'),
        ...getFunctionSignaturesByReturnType('eval', 'string', { scalar: true }, undefined, [
          'concat',
        ]),
      ],
      ' '
    );
    // test that the arg type is correct after minParams
    testSuggestions(
      'from a | eval a=cidr_match(ipField, stringField, ',
      [
        ...getFieldNamesByType('string'),
        ...getFunctionSignaturesByReturnType('eval', 'string', { scalar: true }, undefined, [
          'cidr_match',
        ]),
      ],
      ' '
    );
    // test that comma is correctly added to the suggestions if minParams is not reached yet
    testSuggestions('from a | eval a=cidr_match( ', [
      ...getFieldNamesByType('ip').map((v) => `${v},`),
      ...getFunctionSignaturesByReturnType('eval', 'ip', { scalar: true }, undefined, [
        'cidr_match',
      ]).map((v) => ({ ...v, text: `${v.text},` })),
    ]);
    testSuggestions(
      'from a | eval a=cidr_match(ipField, ',
      [
        ...getFieldNamesByType('string'),
        ...getFunctionSignaturesByReturnType('eval', 'string', { scalar: true }, undefined, [
          'cidr_match',
        ]),
      ],
      ' '
    );
    // test deep function nesting suggestions (and check that the same function is not suggested)
    // round(round(
    // round(round(round(
    // etc...
    for (const nesting of [1, 2, 3, 4]) {
      testSuggestions(
        `from a | eval a=${Array(nesting).fill('round(').join('')}`,
        [
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }, undefined, [
            'round',
          ]),
        ],
        '('
      );
    }

    // Smoke testing for suggestions in previous position than the end of the statement
    testSuggestions(
      'from a | eval var0 = abs(numberField) | eval abs(var0)',
      [
        ',',
        '|',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'number',
        ]),
      ],
      undefined,
      38 /* " " after abs(b) */
    );
    testSuggestions(
      'from a | eval var0 = abs(b) | eval abs(var0)',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { scalar: true }, undefined, [
          'abs',
        ]),
      ],
      undefined,
      26 /* b column in abs */
    );

    // Test suggestions for each possible param, within each signature variation, for each function
    for (const fn of evalFunctionDefinitions) {
      // skip this fn for the moment as it's quite hard to test
      if (fn.name !== 'bucket') {
        for (const signature of fn.signatures) {
          signature.params.forEach((param, i) => {
            if (i < signature.params.length) {
              // This ref signature thing is probably wrong in a few cases, but it matches
              // the logic in getFunctionArgsSuggestions. They should both be updated
              const refSignature = fn.signatures[0];
              const requiresMoreArgs =
                i + 1 < (refSignature.minParams ?? 0) ||
                refSignature.params.filter(({ optional }, j) => !optional && j > i).length > 0;

              const allParamDefs = fn.signatures
                .map((s) => getParamAtPosition(s, i))
                .filter(nonNullable);

              // get all possible types for this param
              const [constantOnlyParamDefs, acceptsFieldParamDefs] = partition(
                allParamDefs,
                (p) => p.constantOnly || /_literal/.test(p.type)
              );

              const getTypesFromParamDefs = (paramDefs: FunctionParameter[]) =>
                Array.from(new Set(paramDefs.map((p) => p.type)));

              const suggestedConstants = param.literalSuggestions || param.literalOptions;

              const addCommaIfRequired = (s: string | PartialSuggestionWithText) => {
                // don't add commas to the empty string or if there are no more required args
                if (!requiresMoreArgs || s === '' || (typeof s === 'object' && s.text === '')) {
                  return s;
                }
                return typeof s === 'string' ? `${s},` : { ...s, text: `${s.text},` };
              };

              testSuggestions(
                `from a | eval ${fn.name}(${Array(i).fill('field').join(', ')}${i ? ',' : ''} )`,
                suggestedConstants?.length
                  ? suggestedConstants.map((option) => `"${option}"${requiresMoreArgs ? ',' : ''}`)
                  : [
                      ...getDateLiteralsByFieldType(getTypesFromParamDefs(acceptsFieldParamDefs)),
                      ...getFieldNamesByType(getTypesFromParamDefs(acceptsFieldParamDefs)),
                      ...getFunctionSignaturesByReturnType(
                        'eval',
                        getTypesFromParamDefs(acceptsFieldParamDefs),
                        { scalar: true },
                        undefined,
                        [fn.name]
                      ),
                      ...getLiteralsByType(getTypesFromParamDefs(constantOnlyParamDefs)),
                    ].map(addCommaIfRequired),
                ' '
              );
              testSuggestions(
                `from a | eval var0 = ${fn.name}(${Array(i).fill('field').join(', ')}${
                  i ? ',' : ''
                } )`,
                suggestedConstants?.length
                  ? suggestedConstants.map((option) => `"${option}"${requiresMoreArgs ? ',' : ''}`)
                  : [
                      ...getDateLiteralsByFieldType(getTypesFromParamDefs(acceptsFieldParamDefs)),
                      ...getFieldNamesByType(getTypesFromParamDefs(acceptsFieldParamDefs)),
                      ...getFunctionSignaturesByReturnType(
                        'eval',
                        getTypesFromParamDefs(acceptsFieldParamDefs),
                        { scalar: true },
                        undefined,
                        [fn.name]
                      ),
                      ...getLiteralsByType(getTypesFromParamDefs(constantOnlyParamDefs)),
                    ].map(addCommaIfRequired),
                ' '
              );
            }
          });
        }
      }
    }

    testSuggestions('from a | eval var0 = bucket(@timestamp, ', getUnitDuration(1), ' ');

    describe('date math', () => {
      const dateSuggestions = timeUnitsToSuggest.map(({ name }) => name);
      // If a literal number is detected then suggest also date period keywords
      testSuggestions(
        'from a | eval a = 1 ',
        [
          ...dateSuggestions,
          ',',
          '|',
          ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
            'number',
          ]),
        ],
        ' '
      );
      testSuggestions('from a | eval a = 1 year ', [
        ',',
        '|',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'time_interval',
        ]),
      ]);
      testSuggestions(
        'from a | eval a = 1 day + 2 ',
        [
          ...dateSuggestions,
          ',',
          '|',
          ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
            'number',
          ]),
        ],
        ' '
      );
      testSuggestions(
        'from a | eval 1 day + 2 ',
        [
          ...dateSuggestions,
          ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
            'number',
          ]),
        ],
        ' '
      );
      testSuggestions(
        'from a | eval var0=date_trunc()',
        [
          ...[...TIME_SYSTEM_PARAMS].map((t) => `${t},`),
          ...getLiteralsByType('time_literal').map((t) => `${t},`),
          ...getFunctionSignaturesByReturnType('eval', 'date', { scalar: true }, undefined, [
            'date_trunc',
          ]).map((t) => ({ ...t, text: `${t.text},` })),
          ...getFieldNamesByType('date').map((t) => `${t},`),
          TIME_PICKER_SUGGESTION,
        ],
        '('
      );
      testSuggestions(
        'from a | eval var0=date_trunc(2 )',
        [...dateSuggestions.map((t) => `${t},`), ','],
        ' '
      );
    });
  });

  describe('values suggestions', () => {
    testSuggestions('FROM "a"', ['a', 'b'], undefined, 7, [
      ,
      [
        { name: 'a', hidden: false },
        { name: 'b', hidden: false },
      ],
    ]);
    testSuggestions('FROM " "', [], ' ');
    // TODO — re-enable these tests when we can support this case
    testSuggestions.skip('FROM "  a"', [], undefined, 9);
    testSuggestions.skip('FROM "foo b"', [], undefined, 11);
    testSuggestions('FROM a | WHERE tags == " "', [], ' ');
    testSuggestions('FROM a | WHERE tags == """ """', [], ' ');
    testSuggestions('FROM a | WHERE tags == "a"', [], undefined, 25);
    testSuggestions('FROM a | EVAL tags == " "', [], ' ');
    testSuggestions('FROM a | EVAL tags == "a"', [], undefined, 24);
    testSuggestions('FROM a | STATS tags == " "', [], ' ');
    testSuggestions('FROM a | STATS tags == "a"', [], undefined, 25);
    testSuggestions('FROM a | GROK "a" "%{WORD:firstWord}"', [], undefined, 16);
    testSuggestions('FROM a | DISSECT "a" "%{WORD:firstWord}"', [], undefined, 19);
  });

  describe('callbacks', () => {
    it('should send the fields query without the last command', async () => {
      const callbackMocks = createCustomCallbackMocks(undefined, undefined, undefined);
      const statement = 'from a | drop stringField | eval var0 = abs(numberField) ';
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
        query: 'from a | drop stringField',
      });
    });
    it('should send the fields query aware of the location', async () => {
      const callbackMocks = createCustomCallbackMocks(undefined, undefined, undefined);
      const statement = 'from a | drop | eval var0 = abs(numberField) ';
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

  describe('auto triggers', () => {
    function getSuggestionsFor(statement: string) {
      const callbackMocks = createCustomCallbackMocks(undefined, undefined, undefined);
      const triggerOffset = statement.lastIndexOf(' ') + 1; // drop <here>
      const context = createCompletionContext(statement[triggerOffset]);
      return suggest(
        statement,
        triggerOffset + 1,
        context,
        async (text) => (text ? getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
        callbackMocks
      );
    }
    it('should trigger further suggestions for functions', async () => {
      const suggestions = await getSuggestionsFor('from a | eval ');
      // test that all functions will retrigger suggestions
      expect(
        suggestions
          .filter(({ kind }) => kind === 'Function')
          .every(({ command }) => command === TRIGGER_SUGGESTION_COMMAND)
      ).toBeTruthy();
      // now test that non-function won't retrigger
      expect(
        suggestions
          .filter(({ kind }) => kind !== 'Function')
          .every(({ command }) => command == null)
      ).toBeTruthy();
    });
    it('should trigger further suggestions for commands', async () => {
      const suggestions = await getSuggestionsFor('from a | ');
      // test that all commands will retrigger suggestions
      expect(
        suggestions.every(({ command }) => command === TRIGGER_SUGGESTION_COMMAND)
      ).toBeTruthy();
    });
    it('should trigger further suggestions after enrich mode', async () => {
      const suggestions = await getSuggestionsFor('from a | enrich _any:');
      // test that all commands will retrigger suggestions
      expect(
        suggestions.every(({ command }) => command === TRIGGER_SUGGESTION_COMMAND)
      ).toBeTruthy();
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
      'f',
      sourceCommands.map((cmd) => `${cmd.toUpperCase()} $0`),
      undefined,
      1
    );

    // pipe command
    testSuggestions(
      'FROM k | E',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name.toUpperCase() + ' $0'),
      undefined,
      10
    );

    // function argument
    testSuggestions(
      'FROM kibana_sample_data_logs | EVAL TRIM(e)',
      [
        ...getFieldNamesByType('string'),
        ...getFunctionSignaturesByReturnType('eval', 'string', { scalar: true }, undefined, [
          'trim',
        ]),
      ],
      undefined,
      42
    );

    // FROM source
    testSuggestions('FROM k', ['index1', 'index2'], undefined, 6, [
      ,
      [
        { name: 'index1', hidden: false },
        { name: 'index2', hidden: false },
      ],
    ]);

    // FROM source METADATA
    testSuggestions('FROM index1 M', [',', 'METADATA $0', '|'], undefined, 13);

    // FROM source METADATA field
    testSuggestions('FROM index1 METADATA _', METADATA_FIELDS, undefined, 22);

    // EVAL argument
    testSuggestions(
      'FROM index1 | EVAL b',
      [
        'var0 =',
        ...getFieldNamesByType('any'),
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      undefined,
      20
    );

    testSuggestions(
      'FROM index1 | EVAL var0 = f',
      [...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true })],
      undefined,
      27
    );

    // DISSECT field
    testSuggestions('FROM index1 | DISSECT b', getFieldNamesByType('string'), undefined, 23);

    // DROP (first field)
    testSuggestions('FROM index1 | DROP f', getFieldNamesByType('any'), undefined, 20);

    // DROP (subsequent field)
    testSuggestions('FROM index1 | DROP field1, f', getFieldNamesByType('any'), undefined, 28);

    // ENRICH policy
    testSuggestions(
      'FROM index1 | ENRICH p',
      policies.map(({ name }) => getSafeInsertText(name)),
      undefined,
      22
    );

    // ENRICH policy ON
    testSuggestions('FROM index1 | ENRICH policy O', ['ON $0', 'WITH $0', '|'], undefined, 29);

    // ENRICH policy ON field
    testSuggestions('FROM index1 | ENRICH policy ON f', getFieldNamesByType('any'), undefined, 32);

    // ENRICH policy WITH policyfield
    testSuggestions(
      'FROM index1 | ENRICH policy WITH v',
      ['var0 =', ...getPolicyFields('policy')],
      undefined,
      34
    );

    testSuggestions(
      'FROM index1 | ENRICH policy WITH \tv',
      ['var0 =', ...getPolicyFields('policy')],
      undefined,
      34
    );

    // GROK field
    testSuggestions('FROM index1 | GROK f', getFieldNamesByType('string'), undefined, 20);

    // KEEP (first field)
    testSuggestions('FROM index1 | KEEP f', getFieldNamesByType('any'), undefined, 20);

    // KEEP (subsequent fields)
    testSuggestions(
      'FROM index1 | KEEP booleanField, f',
      getFieldNamesByType('any').filter((name) => name !== 'booleanField'),
      undefined,
      34
    );

    // LIMIT argument
    // Here we actually test that the invoke trigger kind does not work
    // because it isn't very useful to see literal suggestions when typing a number
    testSuggestions('FROM a | LIMIT 1', ['|'], undefined, 16);

    // MV_EXPAND field
    testSuggestions('FROM index1 | MV_EXPAND f', getFieldNamesByType('any'), undefined, 25);

    // RENAME field
    testSuggestions('FROM index1 | RENAME f', getFieldNamesByType('any'), undefined, 22);

    // RENAME field AS
    testSuggestions('FROM index1 | RENAME field A', ['AS $0'], undefined, 28);

    // RENAME field AS var0
    testSuggestions('FROM index1 | RENAME field AS v', ['var0'], undefined, 31);

    // SORT field
    testSuggestions(
      'FROM index1 | SORT f',
      [
        ...getFunctionSignaturesByReturnType('sort', 'any', { scalar: true }),
        ...getFieldNamesByType('any'),
      ],
      undefined,
      20
    );

    // SORT field order
    testSuggestions('FROM index1 | SORT stringField a', ['ASC', 'DESC', ',', '|'], undefined, 32);

    // SORT field order nulls
    testSuggestions(
      'FROM index1 | SORT stringField ASC n',
      ['NULLS FIRST', 'NULLS LAST', ',', '|'],
      undefined,
      36
    );

    // STATS argument
    testSuggestions(
      'FROM index1 | STATS f',
      ['var0 =', ...getFunctionSignaturesByReturnType('stats', 'any', { scalar: true, agg: true })],
      undefined,
      21
    );

    // STATS argument BY
    testSuggestions('FROM index1 | STATS AVG(booleanField) B', ['BY $0', ',', '|'], undefined, 39);

    // STATS argument BY expression
    testSuggestions(
      'FROM index1 | STATS field BY f',
      [
        'var0 =',
        ...getFunctionSignaturesByReturnType('stats', 'any', { grouping: true, scalar: true }),
        ...getFieldNamesByType('any'),
      ],
      undefined,
      30
    );

    // WHERE argument
    testSuggestions(
      'FROM index1 | WHERE f',
      [
        ...getFieldNamesByType('any'),
        ...getFunctionSignaturesByReturnType('where', 'any', { scalar: true }),
      ],
      undefined,
      22
    );

    // WHERE argument comparison
    testSuggestions(
      'FROM index1 | WHERE stringField i',
      getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
        },
        ['string']
      ),
      undefined,
      33
    );
  });
});
