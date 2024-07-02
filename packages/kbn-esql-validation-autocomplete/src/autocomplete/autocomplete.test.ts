/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { suggest } from './autocomplete';
import { evalFunctionDefinitions } from '../definitions/functions';
import { chronoLiterals, timeUnitsToSuggest } from '../definitions/literals';
import { commandDefinitions } from '../definitions/commands';
import { getUnitDuration, TRIGGER_SUGGESTION_COMMAND } from './factories';
import { camelCase, partition } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { FunctionParameter } from '../definitions/types';
import { getParamAtPosition } from './helper';
import { nonNullable } from '../shared/helpers';
import {
  getPolicyFields,
  policies,
  createCustomCallbackMocks,
  createSuggestContext,
  getFunctionSignaturesByReturnType,
  getFieldNamesByType,
} from './__tests__/helpers';

function getLiteralsByType(_type: string | string[]) {
  const type = Array.isArray(_type) ? _type : [_type];
  if (type.includes('time_literal')) {
    // return only singular
    return timeUnitsToSuggest.map(({ name }) => `1 ${name}`).filter((s) => !/s$/.test(s));
  }
  if (type.includes('chrono_literal')) {
    return chronoLiterals.map(({ name }) => name);
  }
  return [];
}

describe('autocomplete', () => {
  type TestArgs = [
    string,
    string[],
    (string | number)?,
    Parameters<typeof createCustomCallbackMocks>?
  ];

  const testSuggestionsFn = (
    statement: string,
    expected: string[],
    triggerCharacter: string | number = '',
    customCallbacksArgs: Parameters<typeof createCustomCallbackMocks> = [
      undefined,
      undefined,
      undefined,
    ],
    { only, skip }: { only?: boolean; skip?: boolean } = {}
  ) => {
    const triggerCharacterString =
      triggerCharacter == null || typeof triggerCharacter === 'string'
        ? triggerCharacter
        : statement[triggerCharacter + 1];
    const context = createSuggestContext(statement, triggerCharacterString);
    const offset =
      typeof triggerCharacter === 'string'
        ? statement.lastIndexOf(context.triggerCharacter) + 1
        : triggerCharacter;
    const testFn = only ? test.only : skip ? test.skip : test;

    testFn(statement, async () => {
      const callbackMocks = createCustomCallbackMocks(...customCallbacksArgs);
      const suggestions = await suggest(
        statement,
        offset,
        context,
        async (text) => (text ? getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
        callbackMocks
      );

      const sortedSuggestions = suggestions.map((suggestion) => suggestion.text).sort();
      const sortedExpected = expected.sort();

      expect(sortedSuggestions).toEqual(sortedExpected);
    });
  };

  // Enrich the function to work with .only and .skip as regular test function
  //
  // DO NOT CHANGE THE NAME OF THIS FUNCTION WITHOUT ALSO CHANGING
  // THE LINTER RULE IN packages/kbn-eslint-config/typescript.js
  //
  const testSuggestions = Object.assign(testSuggestionsFn, {
    skip: (...args: TestArgs) => {
      const paddingArgs = ['', [undefined, undefined, undefined]].slice(args.length - 2);
      return testSuggestionsFn(
        ...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs),
        {
          skip: true,
        }
      );
    },
    only: (...args: TestArgs) => {
      const paddingArgs = ['', [undefined, undefined, undefined]].slice(args.length - 2);
      return testSuggestionsFn(
        ...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs),
        {
          only: true,
        }
      );
    },
  });

  const sourceCommands = ['row', 'from', 'show', 'metrics'];

  describe('New command', () => {
    testSuggestions(
      ' ',
      sourceCommands.map((name) => name + ' $0')
    );
    testSuggestions(
      'from a | ',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name + ' $0')
    );
    testSuggestions(
      'from a [metadata _id] | ',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name + ' $0')
    );
    testSuggestions(
      'from a | eval var0 = a | ',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name + ' $0')
    );
    testSuggestions(
      'from a [metadata _id] | eval var0 = a | ',
      commandDefinitions
        .filter(({ name }) => !sourceCommands.includes(name))
        .map(({ name }) => name + ' $0')
    );
  });

  describe('show', () => {
    testSuggestions('show ', ['info']);
    for (const fn of ['info']) {
      testSuggestions(`show ${fn} `, ['|']);
    }
  });

  describe('meta', () => {
    testSuggestions('meta ', ['functions']);
    for (const fn of ['functions']) {
      testSuggestions(`meta ${fn} `, ['|']);
    }
  });

  describe('where', () => {
    const allEvalFns = getFunctionSignaturesByReturnType('where', 'any', {
      evalMath: true,
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
      ...getFunctionSignaturesByReturnType('where', 'string', { evalMath: true }),
    ]);
    // Skip these tests until the insensitive case equality gets restored back
    testSuggestions.skip('from a | where stringField =~ ', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('where', 'string', { evalMath: true }),
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
        ...getFunctionSignaturesByReturnType('where', 'any', { evalMath: true }),
      ]);
      testSuggestions(`from a | where stringField >= stringField ${op} numberField `, [
        ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['number']),
      ]);
      testSuggestions(`from a | where stringField >= stringField ${op} numberField == `, [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }),
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
      '',
      // make the fields suggest aware of the previous STATS, leave the other callbacks untouched
      [[{ name: 'a', type: 'number' }], undefined, undefined]
    );
    // The editor automatically inject the final bracket, so it is not useful to test with just open bracket
    testSuggestions(
      'from a | where log10()',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }, undefined, [
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
        ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }, undefined, [
          'pow',
        ]),
      ],
      ','
    );

    testSuggestions('from index | WHERE stringField not ', ['like $0', 'rlike $0', 'in $0']);
    testSuggestions('from index | WHERE stringField NOT ', ['like $0', 'rlike $0', 'in $0']);
    testSuggestions('from index | WHERE not ', [
      ...getFieldNamesByType('boolean'),
      ...getFunctionSignaturesByReturnType('eval', 'boolean', { evalMath: true }),
    ]);
    testSuggestions('from index | WHERE numberField in ', ['( $0 )']);
    testSuggestions('from index | WHERE numberField not in ', ['( $0 )']);
    testSuggestions(
      'from index | WHERE numberField not in ( )',
      [
        ...getFieldNamesByType('number').filter((name) => name !== 'numberField'),
        ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }),
      ],
      '('
    );
    testSuggestions(
      'from index | WHERE numberField in ( `any#Char$Field`, )',
      [
        ...getFieldNamesByType('number').filter(
          (name) => name !== '`any#Char$Field`' && name !== 'numberField'
        ),
        ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }),
      ],
      54 // after the first suggestions
    );
    testSuggestions(
      'from index | WHERE numberField not in ( `any#Char$Field`, )',
      [
        ...getFieldNamesByType('number').filter(
          (name) => name !== '`any#Char$Field`' && name !== 'numberField'
        ),
        ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }),
      ],
      58 // after the first suggestions
    );
  });

  for (const command of ['grok', 'dissect']) {
    describe(command, () => {
      const constantPattern = command === 'grok' ? '"%{WORD:firstWord}"' : '"%{firstWord}"';
      const subExpressions = [
        '',
        `${command} stringField |`,
        `${command} stringField ${constantPattern} |`,
        `dissect stringField ${constantPattern} append_separator = ":" |`,
      ];
      if (command === 'grok') {
        subExpressions.push(`dissect stringField ${constantPattern} |`);
      }
      for (const subExpression of subExpressions) {
        testSuggestions(`from a | ${subExpression} ${command} `, getFieldNamesByType('string'));
        testSuggestions(`from a | ${subExpression} ${command} stringField `, [constantPattern]);
        testSuggestions(
          `from a | ${subExpression} ${command} stringField ${constantPattern} `,
          (command === 'dissect' ? ['append_separator = $0'] : []).concat(['|'])
        );
        if (command === 'dissect') {
          testSuggestions(
            `from a | ${subExpression} ${command} stringField ${constantPattern} append_separator = `,
            ['":"', '";"']
          );
          testSuggestions(
            `from a | ${subExpression} ${command} stringField ${constantPattern} append_separator = ":" `,
            ['|']
          );
        }
      }
    });
  }

  describe('sort', () => {
    testSuggestions('from a | sort ', [
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType('sort', 'any', { evalMath: true }),
    ]);
    testSuggestions('from a | sort stringField ', ['asc', 'desc', ',', '|']);
    testSuggestions('from a | sort stringField desc ', ['nulls first', 'nulls last', ',', '|']);
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
    testSuggestions('from a | rename stringField ', ['as $0']);
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
      testSuggestions(`from a ${prevCommand}| enrich policy `, ['on $0', 'with $0', '|']);
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
        'any#Char$Field',
        'kubernetes.something.something',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b `, ['with $0', ',', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with `, [
        'var0 =',
        ...getPolicyFields('policy'),
      ]);
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
      testSuggestions(`from a ${prevCommand}| enrich policy with `, [
        'var0 =',
        ...getPolicyFields('policy'),
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy with stringField `, ['= $0', ',', '|']);
    }
  });

  describe('eval', () => {
    testSuggestions('from a | eval ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
    ]);
    testSuggestions('from a | eval numberField ', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
        'number',
      ]),
      ',',
      '|',
    ]);
    testSuggestions('from index | EVAL stringField not ', ['like $0', 'rlike $0', 'in $0']);
    testSuggestions('from index | EVAL stringField NOT ', ['like $0', 'rlike $0', 'in $0']);
    testSuggestions('from index | EVAL numberField in ', ['( $0 )']);
    testSuggestions(
      'from index | EVAL numberField in ( )',
      [
        ...getFieldNamesByType('number').filter((name) => name !== 'numberField'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
      ],
      '('
    );
    testSuggestions('from index | EVAL numberField not in ', ['( $0 )']);
    testSuggestions('from index | EVAL not ', [
      ...getFieldNamesByType('boolean'),
      ...getFunctionSignaturesByReturnType('eval', 'boolean', { evalMath: true }),
    ]);
    testSuggestions('from a | eval a=', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
    ]);
    testSuggestions('from a | eval a=abs(numberField), b= ', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
    ]);
    testSuggestions('from a | eval a=numberField, ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      'a',
      ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
    ]);
    // Skip this test until the insensitive case equality gets restored back
    testSuggestions.skip('from a | eval a=stringField =~ ', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('eval', 'string', { evalMath: true }),
    ]);
    testSuggestions(
      'from a | eval a=round()',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
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
      []
    );
    testSuggestions(
      'from a | eval var0 = raund(5, ', // note the typo in round
      []
    );
    testSuggestions('from a | eval a=round(numberField) ', [
      ',',
      '|',
      ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
        'number',
      ]),
    ]);
    testSuggestions('from a | eval a=round(numberField, ', [
      ...getFieldNamesByType('number'),
      ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
        'round',
      ]),
    ]);
    testSuggestions('from a | eval round(numberField, ', [
      ...getFieldNamesByType('number'),
      ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
        'round',
      ]),
    ]);
    testSuggestions('from a | eval a=round(numberField),', [
      'var0 =',
      ...getFieldNamesByType('any'),
      'a',
      ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
    ]);
    testSuggestions('from a | eval a=round(numberField) + ', [
      ...getFieldNamesByType('number'),
      'a', // @TODO remove this
      ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
    ]);
    testSuggestions('from a | eval a=round(numberField)+ ', [
      ...getFieldNamesByType('number'),
      'a', // @TODO remove this
      ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
    ]);
    testSuggestions('from a | eval a=numberField+ ', [
      ...getFieldNamesByType('number'),
      'a', // @TODO remove this
      ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
    ]);
    testSuggestions('from a | eval a=`any#Char$Field`+ ', [
      ...getFieldNamesByType('number'),
      'a', // @TODO remove this
      ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
    ]);
    testSuggestions(
      'from a | stats avg(numberField) by stringField | eval ',
      [
        'var0 =',
        '`avg(numberField)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
      ],
      ' ',
      // make aware EVAL of the previous STATS command
      [[], undefined, undefined]
    );
    testSuggestions(
      'from a | eval abs(numberField) + 1 | eval ',
      [
        'var0 =',
        ...getFieldNamesByType('any'),
        '`abs(numberField) + 1`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
      ],
      ' '
    );
    testSuggestions(
      'from a | stats avg(numberField) by stringField | eval ',
      [
        'var0 =',
        '`avg(numberField)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
      ],
      ' ',
      // make aware EVAL of the previous STATS command with the buggy field name from expression
      [[{ name: 'avg_numberField_', type: 'number' }], undefined, undefined]
    );
    testSuggestions(
      'from a | stats avg(numberField), avg(kubernetes.something.something) by stringField | eval ',
      [
        'var0 =',
        '`avg(numberField)`',
        '`avg(kubernetes.something.something)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
      ],
      ' ',
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
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
          'round',
        ]),
      ],
      '('
    );
    // test that comma is correctly added to the suggestions if minParams is not reached yet
    testSuggestions('from a | eval a=concat( ', [
      ...getFieldNamesByType('string').map((v) => `${v},`),
      ...getFunctionSignaturesByReturnType('eval', 'string', { evalMath: true }, undefined, [
        'concat',
      ]).map((v) => `${v},`),
    ]);
    testSuggestions('from a | eval a=concat(stringField, ', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('eval', 'string', { evalMath: true }, undefined, [
        'concat',
      ]),
    ]);
    // test that the arg type is correct after minParams
    testSuggestions('from a | eval a=cidr_match(ipField, stringField,', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('eval', 'string', { evalMath: true }, undefined, [
        'cidr_match',
      ]),
    ]);
    // test that comma is correctly added to the suggestions if minParams is not reached yet
    testSuggestions('from a | eval a=cidr_match( ', [
      ...getFieldNamesByType('ip').map((v) => `${v},`),
      ...getFunctionSignaturesByReturnType('eval', 'ip', { evalMath: true }, undefined, [
        'cidr_match',
      ]).map((v) => `${v},`),
    ]);
    testSuggestions('from a | eval a=cidr_match(ipField, ', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('eval', 'string', { evalMath: true }, undefined, [
        'cidr_match',
      ]),
    ]);
    // test deep function nesting suggestions (and check that the same function is not suggested)
    // round(round(
    // round(round(round(
    // etc...
    for (const nesting of [1, 2, 3, 4]) {
      testSuggestions(
        `from a | eval a=${Array(nesting).fill('round(').join('')}`,
        [
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
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
      38 /* " " after abs(b) */
    );
    testSuggestions(
      'from a | eval var0 = abs(b) | eval abs(var0)',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
          'abs',
        ]),
      ],
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

              testSuggestions(
                `from a | eval ${fn.name}(${Array(i).fill('field').join(', ')}${i ? ',' : ''} )`,
                suggestedConstants?.length
                  ? suggestedConstants.map((option) => `"${option}"${requiresMoreArgs ? ',' : ''}`)
                  : [
                      ...getFieldNamesByType(getTypesFromParamDefs(acceptsFieldParamDefs)).map(
                        (f) => (requiresMoreArgs ? `${f},` : f)
                      ),
                      ...getFunctionSignaturesByReturnType(
                        'eval',
                        getTypesFromParamDefs(acceptsFieldParamDefs),
                        { evalMath: true },
                        undefined,
                        [fn.name]
                      ).map((l) => (requiresMoreArgs ? `${l},` : l)),
                      ...getLiteralsByType(getTypesFromParamDefs(constantOnlyParamDefs)).map((d) =>
                        requiresMoreArgs ? `${d},` : d
                      ),
                    ]
              );
              testSuggestions(
                `from a | eval var0 = ${fn.name}(${Array(i).fill('field').join(', ')}${
                  i ? ',' : ''
                } )`,
                suggestedConstants?.length
                  ? suggestedConstants.map((option) => `"${option}"${requiresMoreArgs ? ',' : ''}`)
                  : [
                      ...getFieldNamesByType(getTypesFromParamDefs(acceptsFieldParamDefs)).map(
                        (f) => (requiresMoreArgs ? `${f},` : f)
                      ),
                      ...getFunctionSignaturesByReturnType(
                        'eval',
                        getTypesFromParamDefs(acceptsFieldParamDefs),
                        { evalMath: true },
                        undefined,
                        [fn.name]
                      ).map((l) => (requiresMoreArgs ? `${l},` : l)),
                      ...getLiteralsByType(getTypesFromParamDefs(constantOnlyParamDefs)).map((d) =>
                        requiresMoreArgs ? `${d},` : d
                      ),
                    ]
              );
            }
          });
        }
      }
    }

    testSuggestions('from a | eval var0 = bucket(@timestamp,', getUnitDuration(1));

    describe('date math', () => {
      const dateSuggestions = timeUnitsToSuggest.map(({ name }) => name);
      // If a literal number is detected then suggest also date period keywords
      testSuggestions('from a | eval a = 1 ', [
        ...dateSuggestions,
        ',',
        '|',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'number',
        ]),
      ]);
      testSuggestions('from a | eval a = 1 year ', [
        ',',
        '|',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'time_interval',
        ]),
      ]);
      testSuggestions('from a | eval a = 1 day + 2 ', [
        ...dateSuggestions,
        ',',
        '|',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'number',
        ]),
      ]);
      testSuggestions('from a | eval 1 day + 2 ', [
        ...dateSuggestions,
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'number',
        ]),
      ]);
      testSuggestions(
        'from a | eval var0=date_trunc()',
        [
          ...getLiteralsByType('time_literal').map((t) => `${t},`),
          ...getFunctionSignaturesByReturnType('eval', 'date', { evalMath: true }, undefined, [
            'date_trunc',
          ]).map((t) => `${t},`),
          ...getFieldNamesByType('date').map((t) => `${t},`),
        ],
        '('
      );
      testSuggestions('from a | eval var0=date_trunc(2 )', [
        ...dateSuggestions.map((t) => `${t},`),
        ',',
      ]);
    });
  });

  describe('callbacks', () => {
    it('should send the fields query without the last command', async () => {
      const callbackMocks = createCustomCallbackMocks(undefined, undefined, undefined);
      const statement = 'from a | drop stringField | eval var0 = abs(numberField) ';
      const triggerOffset = statement.lastIndexOf(' ');
      const context = createSuggestContext(statement, statement[triggerOffset]);
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
      const context = createSuggestContext(statement, statement[triggerOffset]);
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
      const context = createSuggestContext(statement, statement[triggerOffset]);
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
});
