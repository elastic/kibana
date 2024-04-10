/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { suggest } from './autocomplete';
import { evalFunctionsDefinitions } from '../definitions/functions';
import { builtinFunctions } from '../definitions/builtin';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';
import { chronoLiterals, timeLiterals } from '../definitions/literals';
import { commandDefinitions } from '../definitions/commands';
import { TRIGGER_SUGGESTION_COMMAND } from './factories';
import { camelCase } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { SuggestionRawDefinition } from './types';

const triggerCharacters = [',', '(', '=', ' '];

const fields: Array<{ name: string; type: string; suggestedAs?: string }> = [
  ...['string', 'number', 'date', 'boolean', 'ip'].map((type) => ({
    name: `${type}Field`,
    type,
  })),
  { name: 'any#Char$Field', type: 'number', suggestedAs: '`any#Char$Field`' },
  { name: 'kubernetes.something.something', type: 'number' },
];

const indexes = (
  [] as Array<{ name: string; hidden: boolean; suggestedAs: string | undefined }>
).concat(
  ['a', 'index', 'otherIndex', '.secretIndex', 'my-index'].map((name) => ({
    name,
    hidden: name.startsWith('.'),
    suggestedAs: undefined,
  })),
  ['my-index[quoted]', 'my-index$', 'my_index{}'].map((name) => ({
    name,
    hidden: false,
    suggestedAs: `\`${name}\``,
  }))
);
const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: undefined,
  },
  ...['my-policy[quoted]', 'my-policy$', 'my_policy{}'].map((name) => ({
    name,
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: `\`${name}\``,
  })),
];

/**
 * Utility to filter down the function list for the given type
 * It is mainly driven by the return type, but it can be filtered upon with the last optional argument "paramsTypes"
 * jsut make sure to pass the arguments in the right order
 * @param command current command context
 * @param expectedReturnType the expected type returned by the function
 * @param functionCategories
 * @param paramsTypes the function argument types (optional)
 * @returns
 */
function getFunctionSignaturesByReturnType(
  command: string,
  expectedReturnType: string,
  {
    agg,
    evalMath,
    builtin,
    // skipAssign here is used to communicate to not propose an assignment if it's not possible
    // within the current context (the actual logic has it, but here we want a shortcut)
    skipAssign,
  }: { agg?: boolean; evalMath?: boolean; builtin?: boolean; skipAssign?: boolean } = {},
  paramsTypes?: string[],
  ignored?: string[]
) {
  const list = [];
  if (agg) {
    list.push(...statsAggregationFunctionDefinitions);
  }
  // eval functions (eval is a special keyword in JS)
  if (evalMath) {
    list.push(...evalFunctionsDefinitions);
  }
  if (builtin) {
    list.push(...builtinFunctions.filter(({ name }) => (skipAssign ? name !== '=' : true)));
  }
  return list
    .filter(({ signatures, ignoreAsSuggestion, supportedCommands, name }) => {
      if (ignoreAsSuggestion) {
        return false;
      }
      if (!supportedCommands.includes(command)) {
        return false;
      }
      const filteredByReturnType = signatures.filter(
        ({ returnType }) => expectedReturnType === 'any' || returnType === expectedReturnType
      );
      if (!filteredByReturnType.length) {
        return false;
      }
      if (paramsTypes?.length) {
        return filteredByReturnType.some(
          ({ params }) =>
            !params.length ||
            (paramsTypes.length <= params.length &&
              paramsTypes.every(
                (expectedType, i) =>
                  expectedType === 'any' ||
                  params[i].type === 'any' ||
                  expectedType === params[i].type
              ))
        );
      }
      return true;
    })
    .filter(({ name }) => {
      if (ignored?.length) {
        return !ignored?.includes(name);
      }
      return true;
    })
    .map(({ type, name, signatures }) => {
      if (type === 'builtin') {
        return signatures.some(({ params }) => params.length > 1) ? `${name} $0` : name;
      }
      return `${name}($0)`;
    });
}

function getFieldNamesByType(requestedType: string) {
  return fields
    .filter(({ type }) => requestedType === 'any' || type === requestedType)
    .map(({ name, suggestedAs }) => suggestedAs || name);
}

function getLiteralsByType(type: string) {
  if (type === 'time_literal') {
    // return only singular
    return timeLiterals.map(({ name }) => `1 ${name}`).filter((s) => !/s$/.test(s));
  }
  if (type === 'chrono_literal') {
    return chronoLiterals.map(({ name }) => name);
  }
  return [];
}

function createCustomCallbackMocks(
  customFields: Array<{ name: string; type: string }> | undefined,
  customSources: Array<{ name: string; hidden: boolean }> | undefined,
  customPolicies:
    | Array<{
        name: string;
        sourceIndices: string[];
        matchField: string;
        enrichFields: string[];
      }>
    | undefined
) {
  const finalFields = customFields || fields;
  const finalSources = customSources || indexes;
  const finalPolicies = customPolicies || policies;
  return {
    getFieldsFor: jest.fn(async () => finalFields),
    getSources: jest.fn(async () => finalSources),
    getPolicies: jest.fn(async () => finalPolicies),
    getMetaFields: jest.fn(async () => ['_index', '_score']),
  };
}

function createSuggestContext(text: string, triggerCharacter?: string) {
  if (triggerCharacter) {
    return { triggerCharacter, triggerKind: 1 }; // any number is fine here
  }
  const foundTriggerCharIndexes = triggerCharacters.map((char) => text.lastIndexOf(char));
  const maxIndex = Math.max(...foundTriggerCharIndexes);
  return {
    triggerCharacter: text[maxIndex],
    triggerKind: 1,
  };
}

function getPolicyFields(policyName: string) {
  return policies
    .filter(({ name }) => name === policyName)
    .flatMap(({ enrichFields }) =>
      // ok, this is a bit of cheating as it's using the same logic as in the helper
      enrichFields.map((field) => (/[^a-zA-Z\d_\.@]/.test(field) ? `\`${field}\`` : field))
    );
}

describe('autocomplete', () => {
  type TestArgs = [
    string,
    Array<string | Partial<SuggestionRawDefinition>>,
    (string | number)?,
    Parameters<typeof createCustomCallbackMocks>?
  ];

  const testSuggestionsFn = (
    statement: string,
    expected: Array<string | Partial<SuggestionRawDefinition>>,
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

    testFn(
      `${statement} (triggerChar: "${context.triggerCharacter}" @ ${offset})=> ["${expected.join(
        '","'
      )}"]`,
      async () => {
        const callbackMocks = createCustomCallbackMocks(...customCallbacksArgs);
        const suggestions = await suggest(
          statement,
          offset,
          context,
          async (text) => (text ? await getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
          callbackMocks
        );
        const suggestionInertTextSorted = suggestions
          // simulate the editor behaviour for sorting suggestions
          .sort((a, b) => (a.sortText || '').localeCompare(b.sortText || ''));
        for (const [index, receivedSuggestion] of suggestionInertTextSorted.entries()) {
          if (typeof expected[index] === 'string') {
            expect(receivedSuggestion.text).toEqual(expected[index]);
          } else {
            // check all properties that are defined in the expected suggestion
            for (const [key, value] of Object.entries(expected[index])) {
              expect(receivedSuggestion[key as keyof SuggestionRawDefinition]).toEqual(value);
            }
          }
        }
      }
    );
  };

  // Enrich the function to work with .only and .skip as regular test function
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

  const sourceCommands = ['row', 'from', 'show'];

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

  describe('from', () => {
    const suggestedIndexes = indexes
      .filter(({ hidden }) => !hidden)
      .map(({ name, suggestedAs }) => suggestedAs || name);
    // Monaco will filter further down here
    testSuggestions(
      'f',
      sourceCommands.map((name) => name + ' $0')
    );
    testSuggestions('from ', suggestedIndexes);
    testSuggestions('from a,', suggestedIndexes);
    testSuggestions('from a, b ', ['metadata $0', ',', '|']);
    testSuggestions('from *,', suggestedIndexes);
    testSuggestions('from index', suggestedIndexes, 5 /* space before index */);
    testSuggestions('from a, b [metadata ]', ['_index', '_score'], ' ]');
    testSuggestions('from a, b metadata ', ['_index', '_score'], ' ');
    testSuggestions('from a, b [metadata _index, ]', ['_score'], ' ]');
    testSuggestions('from a, b metadata _index, ', ['_score'], ' ');
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
    testSuggestions('from a | sort ', getFieldNamesByType('any'));
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

  describe('stats', () => {
    const allAggFunctions = getFunctionSignaturesByReturnType('stats', 'any', {
      agg: true,
    });
    const allEvaFunctions = getFunctionSignaturesByReturnType('stats', 'any', {
      evalMath: true,
    });
    testSuggestions('from a | stats ', ['var0 =', ...allAggFunctions, ...allEvaFunctions]);
    testSuggestions('from a | stats a ', [
      { text: '= $0', asSnippet: true, command: TRIGGER_SUGGESTION_COMMAND },
    ]);
    testSuggestions('from a | stats a=', [...allAggFunctions, ...allEvaFunctions]);
    testSuggestions('from a | stats a=max(b) by ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      ...allEvaFunctions,
    ]);
    testSuggestions('from a | stats a=max(b) BY ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      ...allEvaFunctions,
    ]);
    testSuggestions('from a | stats a=c by d ', [',', '|']);
    testSuggestions('from a | stats a=c by d, ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      ...allEvaFunctions,
    ]);
    testSuggestions('from a | stats a=max(b), ', [
      'var0 =',
      ...allAggFunctions,
      ...allEvaFunctions,
    ]);
    testSuggestions(
      'from a | stats a=min()',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('stats', 'number', {
          evalMath: true,
        }),
      ],
      '('
    );
    testSuggestions('from a | stats a=min(b) ', ['by $0', ',', '|']);
    testSuggestions('from a | stats a=min(b) by ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      ...allEvaFunctions,
    ]);
    testSuggestions('from a | stats a=min(b),', ['var0 =', ...allAggFunctions, ...allEvaFunctions]);
    testSuggestions('from a | stats var0=min(b),var1=c,', [
      'var2 =',
      ...allAggFunctions,
      ...allEvaFunctions,
    ]);
    testSuggestions(
      'from a | stats a=min(b), b=max()',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('stats', 'number', {
          evalMath: true,
        }),
      ],
      '('
    );

    testSuggestions('from a | eval var0=round(b), var1=round(c) | stats ', [
      'var2 =',
      ...allAggFunctions,
      'var0',
      'var1',
      ...allEvaFunctions,
    ]);

    // smoke testing with suggestions not at the end of the string
    testSuggestions('from a | stats a = min(b) | sort b', ['by $0', ',', '|'], ') ');
    testSuggestions(
      'from a | stats avg(b) by stringField',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
      ],
      '(b'
    );

    // while nested functions are not suggested, complete them should be possible via suggestions
    testSuggestions('from a | stats avg(b) by numberField % ', [
      ...getFieldNamesByType('number'),
      '`avg(b)`',
      ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
    ]);
    testSuggestions('from a | stats avg(b) by var0 = ', [
      ...getFieldNamesByType('any'),
      ...allEvaFunctions,
    ]);
    testSuggestions('from a | stats avg(b) by c, ', [
      'var0 =',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
    ]);
    testSuggestions('from a | stats avg(b) by c, var0 = ', [
      ...getFieldNamesByType('any'),
      ...allEvaFunctions,
    ]);
    testSuggestions('from a | stats avg(b) by numberField % 2 ', [',', '|']);

    testSuggestions(
      'from a | stats round(',
      [
        ...getFunctionSignaturesByReturnType('stats', 'number', { agg: true }),
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
          'round',
        ]),
      ],
      '('
    );
    testSuggestions(
      'from a | stats round(round(',
      [
        ...getFunctionSignaturesByReturnType('stats', 'number', { agg: true }),
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
          'round',
        ]),
      ],
      '('
    );
    testSuggestions(
      'from a | stats avg(round(',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
          'round',
        ]),
      ],
      '('
    );
    testSuggestions(
      'from a | stats avg(',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
      ],
      '('
    );
    testSuggestions(
      'from a | stats round(avg(',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
          'round',
        ]),
      ],
      '('
    );
  });

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
    for (const fn of evalFunctionsDefinitions) {
      // skip this fn for the moment as it's quite hard to test
      if (fn.name !== 'auto_bucket') {
        for (const signature of fn.signatures) {
          signature.params.forEach((param, i) => {
            if (i < signature.params.length - 1) {
              const canHaveMoreArgs =
                signature.params.filter(({ optional }, j) => !optional && j > i).length > i;
              testSuggestions(
                `from a | eval ${fn.name}(${Array(i).fill('field').join(', ')}${i ? ',' : ''} )`,
                [
                  ...getFieldNamesByType(param.type).map((f) => (canHaveMoreArgs ? `${f},` : f)),
                  ...getFunctionSignaturesByReturnType(
                    'eval',
                    param.type,
                    { evalMath: true },
                    undefined,
                    [fn.name]
                  ).map((l) => (canHaveMoreArgs ? `${l},` : l)),
                  ...getLiteralsByType(param.type).map((d) => (canHaveMoreArgs ? `${d},` : d)),
                ]
              );
              testSuggestions(
                `from a | eval var0 = ${fn.name}(${Array(i).fill('field').join(', ')}${
                  i ? ',' : ''
                } )`,
                [
                  ...getFieldNamesByType(param.type).map((f) => (canHaveMoreArgs ? `${f},` : f)),
                  ...getFunctionSignaturesByReturnType(
                    'eval',
                    param.type,
                    { evalMath: true },
                    undefined,
                    [fn.name]
                  ).map((l) => (canHaveMoreArgs ? `${l},` : l)),
                  ...getLiteralsByType(param.type).map((d) => (canHaveMoreArgs ? `${d},` : d)),
                ]
              );
            }
          });
        }
      }
    }

    testSuggestions('from a | eval var0 = auto_bucket(@timestamp,', []);

    describe('date math', () => {
      const dateSuggestions = timeLiterals.map(({ name }) => name);
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
        [...getLiteralsByType('time_literal').map((t) => `${t},`)],
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
        async (text) => (text ? await getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
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
        async (text) => (text ? await getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
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
        async (text) => (text ? await getAstAndSyntaxErrors(text) : { ast: [], errors: [] }),
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
