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
import { commandDefinitions as unmodifiedCommandDefinitions } from '../definitions/commands';
import {
  getSafeInsertText,
  getUnitDuration,
  TIME_SYSTEM_PARAMS,
  TRIGGER_SUGGESTION_COMMAND,
} from './factories';
import { camelCase, partition } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import {
  FunctionParameter,
  isFieldType,
  isSupportedDataType,
  SupportedDataType,
} from '../definitions/types';
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
  setup,
} from './__tests__/helpers';
import { METADATA_FIELDS } from '../shared/constants';
import { ESQL_COMMON_NUMERIC_TYPES, ESQL_STRING_TYPES } from '../shared/esql_types';

const roundParameterTypes = ['double', 'integer', 'long', 'unsigned_long'] as const;
const powParameterTypes = ['double', 'integer', 'long', 'unsigned_long'] as const;
const log10ParameterTypes = ['double', 'integer', 'long', 'unsigned_long'] as const;

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
      // Unskip once https://github.com/elastic/kibana/issues/190070 is fixed
      testSuggestions.skip(
        `from a | ${subExpression} grok /`,
        getFieldNamesByType(ESQL_STRING_TYPES)
      );
      testSuggestions(`from a | ${subExpression} grok keywordField /`, [constantPattern], ' ');
      testSuggestions(`from a | ${subExpression} grok keywordField ${constantPattern} /`, ['| ']);
    }
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
      // Unskip once https://github.com/elastic/kibana/issues/190070 is fixed
      testSuggestions.skip(
        `from a | ${subExpression} dissect /`,
        getFieldNamesByType(ESQL_STRING_TYPES)
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
  });

  describe('sort', () => {
    testSuggestions('from a | sort /', [
      ...getFieldNamesByType('any').map((name) => `${name} `),
      ...getFunctionSignaturesByReturnType('sort', 'any', { scalar: true }),
    ]);
    testSuggestions('from a | sort keywordField /', ['ASC ', 'DESC ', ',', '| ']);
    testSuggestions('from a | sort keywordField desc /', [
      'NULLS FIRST ',
      'NULLS LAST ',
      ',',
      '| ',
    ]);
    // @TODO: improve here
    // testSuggestions('from a | sort keywordField desc ', ['first', 'last']);
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
    const policyNames = policies.map(({ name, suggestedAs }) => suggestedAs || name);
    for (const prevCommand of [
      '',
      // '| enrich other-policy ',
      // '| enrich other-policy on b ',
      // '| enrich other-policy with c ',
    ]) {
      testSuggestions(`from a ${prevCommand}| enrich /`, policyNames);
      testSuggestions(
        `from a ${prevCommand}| enrich _/`,
        modes.map((mode) => `_${mode}:$0`),
        '_'
      );
      for (const mode of modes) {
        testSuggestions(`from a ${prevCommand}| enrich _${mode}:/`, policyNames, ':');
        testSuggestions(`from a ${prevCommand}| enrich _${mode.toUpperCase()}:/`, policyNames, ':');
        testSuggestions(`from a ${prevCommand}| enrich _${camelCase(mode)}:/`, policyNames, ':');
      }
      testSuggestions(`from a ${prevCommand}| enrich policy /`, ['ON $0', 'WITH $0', '| ']);
      testSuggestions(`from a ${prevCommand}| enrich policy on /`, getFieldNamesByType('any'));
      testSuggestions(`from a ${prevCommand}| enrich policy on b /`, ['WITH $0', ',', '| ']);
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

  describe('eval', () => {
    testSuggestions('from a | eval /', [
      'var0 = ',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);
    testSuggestions('from a | eval doubleField /', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
        'double',
      ]),
      ',',
      '| ',
    ]);
    testSuggestions('from index | EVAL keywordField not /', ['LIKE $0', 'RLIKE $0', 'IN $0']);
    testSuggestions('from index | EVAL keywordField NOT /', ['LIKE $0', 'RLIKE $0', 'IN $0']);
    testSuggestions('from index | EVAL doubleField in /', ['( $0 )']);
    testSuggestions(
      'from index | EVAL doubleField in (/)',
      [
        ...getFieldNamesByType('double').filter((name) => name !== 'doubleField'),
        ...getFunctionSignaturesByReturnType('eval', 'double', { scalar: true }),
      ],
      '('
    );
    testSuggestions('from index | EVAL doubleField not in /', ['( $0 )']);
    testSuggestions('from index | EVAL not /', [
      ...getFieldNamesByType('boolean'),
      ...getFunctionSignaturesByReturnType('eval', 'boolean', { scalar: true }),
    ]);
    testSuggestions(
      'from a | eval a=/',
      [...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true })],
      '='
    );
    testSuggestions(
      'from a | eval a=abs(doubleField), b= /',
      [...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true })],
      '='
    );
    testSuggestions('from a | eval a=doubleField, /', [
      'var0 = ',
      ...getFieldNamesByType('any'),
      'a',
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);
    testSuggestions(
      'from a | eval a=round(/)',
      [
        ...getFieldNamesByType(roundParameterTypes),
        ...getFunctionSignaturesByReturnType(
          'eval',
          roundParameterTypes,
          { scalar: true },
          undefined,
          ['round']
        ),
      ],
      '('
    );
    testSuggestions(
      'from a | eval a=raund(/)', // note the typo in round
      [],
      '('
    );
    testSuggestions(
      'from a | eval a=raund(/', // note the typo in round
      []
    );
    testSuggestions(
      'from a | eval raund(/', // note the typo in round
      []
    );
    testSuggestions(
      'from a | eval raund(5, /', // note the typo in round
      [],
      ' '
    );
    testSuggestions(
      'from a | eval var0 = raund(5, /', // note the typo in round
      [],
      ' '
    );
    testSuggestions('from a | eval a=round(doubleField) /', [
      ',',
      '| ',
      ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
        'double',
      ]),
    ]);
    testSuggestions(
      'from a | eval a=round(doubleField, /',
      [
        ...getFieldNamesByType('integer'),
        ...getFunctionSignaturesByReturnType('eval', 'integer', { scalar: true }, undefined, [
          'round',
        ]),
      ],
      ' '
    );
    testSuggestions(
      'from a | eval round(doubleField, /',
      [
        ...getFieldNamesByType('integer'),
        ...getFunctionSignaturesByReturnType('eval', 'integer', { scalar: true }, undefined, [
          'round',
        ]),
      ],
      ' '
    );
    testSuggestions('from a | eval a=round(doubleField),/', [
      'var0 = ',
      ...getFieldNamesByType('any'),
      'a',
      ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
    ]);
    testSuggestions('from a | eval a=round(doubleField) + /', [
      ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
      ...getFunctionSignaturesByReturnType('eval', ESQL_COMMON_NUMERIC_TYPES, {
        scalar: true,
      }),
    ]);
    testSuggestions('from a | eval a=round(doubleField)+ /', [
      ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
      ...getFunctionSignaturesByReturnType('eval', ESQL_COMMON_NUMERIC_TYPES, {
        scalar: true,
      }),
    ]);
    testSuggestions('from a | eval a=doubleField+ /', [
      ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
      ...getFunctionSignaturesByReturnType('eval', ESQL_COMMON_NUMERIC_TYPES, {
        scalar: true,
      }),
    ]);
    testSuggestions('from a | eval a=`any#Char$Field`+ /', [
      ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
      ...getFunctionSignaturesByReturnType('eval', ESQL_COMMON_NUMERIC_TYPES, {
        scalar: true,
      }),
    ]);
    testSuggestions(
      'from a | stats avg(doubleField) by keywordField | eval /',
      [
        'var0 = ',
        '`avg(doubleField)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      ' ',
      // make aware EVAL of the previous STATS command
      [[], undefined, undefined]
    );
    testSuggestions(
      'from a | eval abs(doubleField) + 1 | eval /',
      [
        'var0 = ',
        ...getFieldNamesByType('any'),
        '`abs(doubleField) + 1`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      ' '
    );
    testSuggestions(
      'from a | stats avg(doubleField) by keywordField | eval /',
      [
        'var0 = ',
        '`avg(doubleField)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      ' ',
      // make aware EVAL of the previous STATS command with the buggy field name from expression
      [[{ name: 'avg_doubleField_', type: 'double' }], undefined, undefined]
    );
    testSuggestions(
      'from a | stats avg(doubleField), avg(kubernetes.something.something) by keywordField | eval /',
      [
        'var0 = ',
        '`avg(doubleField)`',
        '`avg(kubernetes.something.something)`',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ],
      ' ',
      // make aware EVAL of the previous STATS command with the buggy field name from expression
      [
        [
          { name: 'avg_doubleField_', type: 'double' },
          { name: 'avg_kubernetes.something.something_', type: 'double' },
        ],
        undefined,
        undefined,
      ]
    );

    testSuggestions(
      'from a | eval a=round(doubleField), b=round(/)',
      [
        ...getFieldNamesByType(roundParameterTypes),
        ...getFunctionSignaturesByReturnType(
          'eval',
          roundParameterTypes,
          { scalar: true },
          undefined,
          ['round']
        ),
      ],
      '('
    );
    // test that comma is correctly added to the suggestions if minParams is not reached yet
    testSuggestions('from a | eval a=concat( /', [
      ...getFieldNamesByType(['text', 'keyword']).map((v) => `${v}, `),
      ...getFunctionSignaturesByReturnType(
        'eval',
        ['text', 'keyword'],
        { scalar: true },
        undefined,
        ['concat']
      ).map((v) => ({ ...v, text: `${v.text},` })),
    ]);
    testSuggestions(
      'from a | eval a=concat(textField, /',
      [
        ...getFieldNamesByType(['text', 'keyword']),
        ...getFunctionSignaturesByReturnType(
          'eval',
          ['text', 'keyword'],
          { scalar: true },
          undefined,
          ['concat']
        ),
      ],
      ' '
    );
    // test that the arg type is correct after minParams
    testSuggestions(
      'from a | eval a=cidr_match(ipField, textField, /',
      [
        ...getFieldNamesByType('text'),
        ...getFunctionSignaturesByReturnType('eval', 'text', { scalar: true }, undefined, [
          'cidr_match',
        ]),
      ],
      ' '
    );
    // test that comma is correctly added to the suggestions if minParams is not reached yet
    testSuggestions('from a | eval a=cidr_match(/', [
      ...getFieldNamesByType('ip').map((v) => `${v}, `),
      ...getFunctionSignaturesByReturnType('eval', 'ip', { scalar: true }, undefined, [
        'cidr_match',
      ]).map((v) => ({ ...v, text: `${v.text},` })),
    ]);
    testSuggestions(
      'from a | eval a=cidr_match(ipField, /',
      [
        ...getFieldNamesByType(['text', 'keyword']),
        ...getFunctionSignaturesByReturnType(
          'eval',
          ['text', 'keyword'],
          { scalar: true },
          undefined,
          ['cidr_match']
        ),
      ],
      ' '
    );
    // test deep function nesting suggestions (and check that the same function is not suggested)
    // round(round(
    // round(round(round(
    // etc...

    for (const nesting of [1, 2, 3, 4]) {
      testSuggestions(
        `from a | eval a=${Array(nesting).fill('round(/').join('')}`,
        [
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            'eval',
            roundParameterTypes,
            { scalar: true },
            undefined,
            ['round']
          ),
        ],
        '('
      );
    }

    const absParameterTypes = ['double', 'integer', 'long', 'unsigned_long'] as const;

    // Smoke testing for suggestions in previous position than the end of the statement
    testSuggestions('from a | eval var0 = abs(doubleField) / | eval abs(var0)', [
      ',',
      '| ',
      ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
        'double',
      ]),
    ]);
    testSuggestions('from a | eval var0 = abs(b/) | eval abs(var0)', [
      ...getFieldNamesByType(absParameterTypes),
      ...getFunctionSignaturesByReturnType('eval', absParameterTypes, { scalar: true }, undefined, [
        'abs',
      ]),
    ]);

    // Test suggestions for each possible param, within each signature variation, for each function
    for (const fn of evalFunctionDefinitions) {
      // skip this fn for the moment as it's quite hard to test
      if (!['bucket', 'date_extract', 'date_diff', 'case'].includes(fn.name)) {
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
                (p) => p.constantOnly || /_literal/.test(p.type as string)
              );

              const getTypesFromParamDefs = (paramDefs: FunctionParameter[]): SupportedDataType[] =>
                Array.from(new Set(paramDefs.map((p) => p.type))).filter(isSupportedDataType);

              const suggestedConstants = param.literalSuggestions || param.literalOptions;

              const addCommaIfRequired = (s: string | PartialSuggestionWithText) => {
                // don't add commas to the empty string or if there are no more required args
                if (!requiresMoreArgs || s === '' || (typeof s === 'object' && s.text === '')) {
                  return s;
                }
                return typeof s === 'string' ? `${s}, ` : { ...s, text: `${s.text},` };
              };

              testSuggestions(
                `from a | eval ${fn.name}(${Array(i).fill('field').join(', ')}${i ? ',' : ''} /)`,
                suggestedConstants?.length
                  ? suggestedConstants.map((option) => `"${option}"${requiresMoreArgs ? ', ' : ''}`)
                  : [
                      ...getDateLiteralsByFieldType(
                        getTypesFromParamDefs(acceptsFieldParamDefs).filter(isFieldType)
                      ),
                      ...getFieldNamesByType(
                        getTypesFromParamDefs(acceptsFieldParamDefs).filter(isFieldType)
                      ),
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
                } /)`,
                suggestedConstants?.length
                  ? suggestedConstants.map((option) => `"${option}"${requiresMoreArgs ? ', ' : ''}`)
                  : [
                      ...getDateLiteralsByFieldType(
                        getTypesFromParamDefs(acceptsFieldParamDefs).filter(isFieldType)
                      ),
                      ...getFieldNamesByType(
                        getTypesFromParamDefs(acceptsFieldParamDefs).filter(isFieldType)
                      ),
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

      // The above test fails cause it expects nested functions like
      // DATE_EXTRACT(concat("aligned_day_","of_week_in_month"), date) to also be suggested
      // which is actually valid according to func signature
      // but currently, our autocomplete only suggests the literal suggestions
      if (['date_extract', 'date_diff'].includes(fn.name)) {
        const firstParam = fn.signatures[0].params[0];
        const suggestedConstants = firstParam?.literalSuggestions || firstParam?.literalOptions;
        const requiresMoreArgs = true;

        testSuggestions(
          `from a | eval ${fn.name}(/`,
          suggestedConstants?.length
            ? [...suggestedConstants.map((option) => `"${option}"${requiresMoreArgs ? ', ' : ''}`)]
            : []
        );
      }
    }

    testSuggestions('from a | eval var0 = bucket(@timestamp, /', getUnitDuration(1), ' ');

    describe('date math', () => {
      const dateSuggestions = timeUnitsToSuggest.map(({ name }) => name);
      // If a literal number is detected then suggest also date period keywords
      testSuggestions(
        'from a | eval a = 1 /',
        [
          ...dateSuggestions,
          ',',
          '| ',
          ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
            'integer',
          ]),
        ],
        ' '
      );
      testSuggestions('from a | eval a = 1 year /', [
        ',',
        '| ',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'time_interval',
        ]),
      ]);
      testSuggestions('from a | eval a = 1 day + 2 /', [',', '| ']);
      testSuggestions(
        'from a | eval 1 day + 2 /',
        [
          ...dateSuggestions,
          ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
            'integer',
          ]),
        ],
        ' '
      );
      testSuggestions(
        'from a | eval var0=date_trunc(/)',
        getLiteralsByType('time_literal').map((t) => `${t}, `),
        '('
      );
      testSuggestions(
        'from a | eval var0=date_trunc(2 /)',
        [...dateSuggestions.map((t) => `${t}, `), ','],
        ' '
      );
    });
  });

  describe('values suggestions', () => {
    testSuggestions('FROM "a/"', ['a ', 'b '], undefined, [
      ,
      [
        { name: 'a', hidden: false },
        { name: 'b', hidden: false },
      ],
    ]);
    testSuggestions('FROM " /"', [], ' ');
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
    testSuggestions('FROM k/', ['index1 ', 'index2 '], undefined, [
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
    // enable once https://github.com/elastic/kibana/issues/190070 is fixed
    testSuggestions.skip('FROM index1 | DISSECT b/', getFieldNamesByType(ESQL_STRING_TYPES));

    // DROP (first field)
    testSuggestions('FROM index1 | DROP f/', getFieldNamesByType('any'));

    // DROP (subsequent field)
    testSuggestions('FROM index1 | DROP field1, f/', getFieldNamesByType('any'));

    // ENRICH policy
    testSuggestions(
      'FROM index1 | ENRICH p/',
      policies.map(({ name }) => getSafeInsertText(name))
    );

    // ENRICH policy ON
    testSuggestions('FROM index1 | ENRICH policy O/', ['ON $0', 'WITH $0', '| ']);

    // ENRICH policy ON field
    testSuggestions('FROM index1 | ENRICH policy ON f/', getFieldNamesByType('any'));

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
    // enable once https://github.com/elastic/kibana/issues/190070
    testSuggestions.skip('FROM index1 | GROK f/', getFieldNamesByType(ESQL_STRING_TYPES));

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

    // SORT field
    testSuggestions('FROM index1 | SORT f/', [
      ...getFunctionSignaturesByReturnType('sort', 'any', { scalar: true }),
      ...getFieldNamesByType('any').map((field) => `${field} `),
    ]);

    // SORT field order
    testSuggestions('FROM index1 | SORT keywordField a/', ['ASC ', 'DESC ', ',', '| ']);

    // SORT field order nulls
    testSuggestions('FROM index1 | SORT keywordField ASC n/', [
      'NULLS FIRST ',
      'NULLS LAST ',
      ',',
      '| ',
    ]);

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
        evalFunctionDefinitions.find(({ name }) => name === 'date_diff')?.signatures[0].params?.[0]
          .literalSuggestions ?? [];
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
    //
    // Using an Invoke trigger kind here because that's what Monaco uses when the show suggestions
    // action is triggered (e.g. accepting the "FROM" suggestion)
    testSuggestions(
      'FROM /',
      [
        { text: 'index1 ', command: TRIGGER_SUGGESTION_COMMAND },
        { text: 'index2 ', command: TRIGGER_SUGGESTION_COMMAND },
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

    // FROM source METADATA
    testSuggestions('FROM index1 M/', [
      ',',
      attachAsSnippet(attachTriggerCommand('METADATA $0')),
      '| ',
    ]);

    // LIMIT number
    testSuggestions('FROM a | LIMIT /', ['10 ', '100 ', '1000 '].map(attachTriggerCommand));

    // SORT field
    testSuggestions(
      'FROM a | SORT /',
      [
        ...getFieldNamesByType('any').map((field) => `${field} `),
        ...getFunctionSignaturesByReturnType('sort', 'any', { scalar: true }),
      ].map(attachTriggerCommand)
    );

    // SORT field order
    testSuggestions('FROM a | SORT field /', [
      ',',
      ...['ASC ', 'DESC ', '| '].map(attachTriggerCommand),
    ]);

    // SORT field order nulls
    testSuggestions('FROM a | SORT field ASC /', [
      ',',
      ...['NULLS FIRST ', 'NULLS LAST ', '| '].map(attachTriggerCommand),
    ]);

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
      attachTriggerCommand('var0 = '),
      ...getFieldNamesByType('any')
        .map((field) => `${field} `)
        .map(attachTriggerCommand),
      ...allByCompatibleFunctions,
    ]);

    // STATS argument BY assignment (checking field suggestions)
    testSuggestions('FROM a | STATS AVG(numberField) BY var0 = /', [
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
  });
});
