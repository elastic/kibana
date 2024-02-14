/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EditorError } from '../../../../types';
import { CharStreams } from 'antlr4ts';
import { getActions } from './actions';
import { getParser, ROOT_STATEMENT } from '../../antlr_facade';
import { ESQLErrorListener } from '../../monaco/esql_error_listener';
import { AstListener } from '../ast_factory';
import { wrapAsMonacoMessage } from '../shared/monaco_utils';
import { ESQLAst } from '../types';
import { validateAst } from '../validation/validation';
import { monaco } from '../../../../monaco_imports';
import { getAllFunctions } from '../shared/helpers';

function getCallbackMocks() {
  return {
    getFieldsFor: jest.fn(async ({ query }) =>
      /enrich/.test(query)
        ? [
            { name: 'otherField', type: 'string' },
            { name: 'yetAnotherField', type: 'number' },
          ]
        : /unsupported_index/.test(query)
        ? [{ name: 'unsupported_field', type: 'unsupported' }]
        : [
            ...['string', 'number', 'date', 'boolean', 'ip'].map((type) => ({
              name: `${type}Field`,
              type,
            })),
            { name: 'geoPointField', type: 'geo_point' },
            { name: 'any#Char$Field', type: 'number' },
            { name: 'kubernetes.something.something', type: 'number' },
            {
              name: `listField`,
              type: `list`,
            },
            { name: '@timestamp', type: 'date' },
          ]
    ),
    getSources: jest.fn(async () =>
      ['index', '.secretIndex', 'my-index'].map((name) => ({
        name,
        hidden: name.startsWith('.'),
      }))
    ),
    getPolicies: jest.fn(async () => [
      {
        name: 'policy',
        sourceIndices: ['enrichIndex1'],
        matchField: 'otherStringField',
        enrichFields: ['other-field', 'yetAnotherField'],
      },
      {
        name: 'policy[]',
        sourceIndices: ['enrichIndex1'],
        matchField: 'otherStringField',
        enrichFields: ['other-field', 'yetAnotherField'],
      },
    ]),
    getMetaFields: jest.fn(async () => ['_index', '_id', '_source', '_score']),
  };
}

const getAstAndErrors = async (
  text: string | undefined
): Promise<{
  errors: EditorError[];
  ast: ESQLAst;
}> => {
  if (text == null) {
    return { ast: [], errors: [] };
  }
  const errorListener = new ESQLErrorListener();
  const parseListener = new AstListener();
  const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

  parser[ROOT_STATEMENT]();

  return { ...parseListener.getAst(), errors: errorListener.getErrors() };
};

function createModelAndRange(text: string) {
  return {
    model: { getValue: () => text } as monaco.editor.ITextModel,
    range: {} as monaco.Range,
  };
}

function createMonacoContext(errors: EditorError[]): monaco.languages.CodeActionContext {
  return {
    markers: errors,
    trigger: 1,
  };
}

/**
 * There are different wats to test the code here: one is a direct unit test of the feature, another is
 * an integration test passing from the query statement validation. The latter is more realistic, but
 * a little bit more tricky to setup. This function will encapsulate all the complexity
 */
function testQuickFixesFn(
  statement: string,
  expectedFixes: string[] = [],
  options: { equalityCheck?: 'include' | 'equal' } = {},
  { only, skip }: { only?: boolean; skip?: boolean } = {}
) {
  const testFn = only ? it.only : skip ? it.skip : it;
  const { model, range } = createModelAndRange(statement);
  testFn(`${statement} => ["${expectedFixes.join('","')}"]`, async () => {
    const callbackMocks = getCallbackMocks();
    const { errors } = await validateAst(statement, getAstAndErrors, callbackMocks);

    const monacoErrors = wrapAsMonacoMessage('error', statement, errors);
    const context = createMonacoContext(monacoErrors);
    const actions = await getActions(model, range, context, getAstAndErrors, callbackMocks);
    const edits = actions.map(
      ({ edit }) => (edit?.edits[0] as monaco.languages.IWorkspaceTextEdit).textEdit.text
    );
    expect(edits).toEqual(
      !options || !options.equalityCheck || options.equalityCheck === 'equal'
        ? expectedFixes
        : expect.arrayContaining(expectedFixes)
    );
  });
}

type TestArgs = [string, string[], { equalityCheck?: 'include' | 'equal' }?];

// Make only and skip work with our custom wrapper
const testQuickFixes = Object.assign(testQuickFixesFn, {
  skip: (...args: TestArgs) => {
    const paddingArgs = ['equal'].slice(args.length - 2);
    return testQuickFixesFn(...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs), {
      skip: true,
    });
  },
  only: (...args: TestArgs) => {
    const paddingArgs = ['equal'].slice(args.length - 2);
    return testQuickFixesFn(...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs), {
      only: true,
    });
  },
});

describe('quick fixes logic', () => {
  describe('fixing index spellchecks', () => {
    // No error, no quick action
    testQuickFixes('FROM index', []);
    testQuickFixes('FROM index2', ['index']);
    testQuickFixes('FROM myindex', ['index', 'my-index']);
    // wildcards
    testQuickFixes('FROM index*', []);
    testQuickFixes('FROM ind*', []);
    testQuickFixes('FROM end*', ['ind*']);
    testQuickFixes('FROM endex*', ['index']);
    // Too far for the levenstein distance and should not fix with a hidden index
    testQuickFixes('FROM secretIndex', []);
    testQuickFixes('FROM secretIndex2', []);
  });

  describe('fixing fields spellchecks', () => {
    for (const command of ['KEEP', 'DROP', 'EVAL']) {
      testQuickFixes(`FROM index | ${command} stringField`, []);
      // strongField => stringField
      testQuickFixes(`FROM index | ${command} strongField`, ['stringField']);
      testQuickFixes(`FROM index | ${command} numberField, strongField`, ['stringField']);
    }
    testQuickFixes(`FROM index | EVAL round(strongField)`, ['stringField']);
    testQuickFixes(`FROM index | EVAL var0 = round(strongField)`, ['stringField']);
    testQuickFixes(`FROM index | WHERE round(strongField) > 0`, ['stringField']);
    testQuickFixes(`FROM index | WHERE 0 < round(strongField)`, ['stringField']);
    testQuickFixes(`FROM index | RENAME strongField as newField`, ['stringField']);
    // This levarage the knowledge of the enrich policy fields to suggest the right field
    testQuickFixes(`FROM index | ENRICH policy | KEEP yetAnotherField2`, ['yetAnotherField']);
    testQuickFixes(`FROM index | ENRICH policy ON strongField`, ['stringField']);
    testQuickFixes(`FROM index | ENRICH policy ON stringField WITH yetAnotherField2`, [
      'yetAnotherField',
    ]);

    describe('metafields spellchecks', () => {
      for (const isWrapped of [true, false]) {
        function setWrapping(text: string) {
          return isWrapped ? `[${text}]` : text;
        }
        testQuickFixes(`FROM index ${setWrapping('metadata _i_ndex')}`, ['_index']);
        testQuickFixes(`FROM index ${setWrapping('metadata _id, _i_ndex')}`, ['_index']);
        testQuickFixes(`FROM index ${setWrapping('METADATA _id, _i_ndex')}`, ['_index']);
      }
    });
  });

  describe('fixing meta fields spellchecks', () => {
    for (const command of ['KEEP', 'DROP', 'EVAL']) {
      testQuickFixes(`FROM index | ${command} stringField`, []);
      // strongField => stringField
      testQuickFixes(`FROM index | ${command} strongField`, ['stringField']);
      testQuickFixes(`FROM index | ${command} numberField, strongField`, ['stringField']);
    }
    testQuickFixes(`FROM index | EVAL round(strongField)`, ['stringField']);
    testQuickFixes(`FROM index | EVAL var0 = round(strongField)`, ['stringField']);
    testQuickFixes(`FROM index | WHERE round(strongField) > 0`, ['stringField']);
    testQuickFixes(`FROM index | WHERE 0 < round(strongField)`, ['stringField']);
    testQuickFixes(`FROM index | RENAME strongField as newField`, ['stringField']);
    // This levarage the knowledge of the enrich policy fields to suggest the right field
    testQuickFixes(`FROM index | ENRICH policy | KEEP yetAnotherField2`, ['yetAnotherField']);
    testQuickFixes(`FROM index | ENRICH policy ON strongField`, ['stringField']);
    testQuickFixes(`FROM index | ENRICH policy ON stringField WITH yetAnotherField2`, [
      'yetAnotherField',
    ]);
  });

  describe('fixing policies spellchecks', () => {
    testQuickFixes(`FROM index | ENRICH poli`, ['policy']);
    testQuickFixes(`FROM index | ENRICH mypolicy`, ['policy']);
    testQuickFixes(`FROM index | ENRICH policy[`, ['policy', 'policy[]']);

    describe('modes', () => {
      testQuickFixes(`FROM index | ENRICH _ann:policy`, ['_any']);
      const modes = ['_any', '_coordinator', '_remote'];
      for (const mode of modes) {
        testQuickFixes(`FROM index | ENRICH ${mode.replace('_', '@')}:policy`, [mode]);
      }
      testQuickFixes(`FROM index | ENRICH unknown:policy`, modes);
    });
  });

  describe('fixing function spellchecks', () => {
    function toFunctionSignature(name: string) {
      return `${name}()`;
    }
    // it should be strange enough to make the function invalid
    const BROKEN_PREFIX = 'Q';
    for (const fn of getAllFunctions({ type: 'eval' })) {
      // add an A to the function name to make it invalid
      testQuickFixes(
        `FROM index | EVAL ${BROKEN_PREFIX}${fn.name}()`,
        [fn.name].map(toFunctionSignature),
        { equalityCheck: 'include' }
      );
      testQuickFixes(
        `FROM index | EVAL var0 = ${BROKEN_PREFIX}${fn.name}()`,
        [fn.name].map(toFunctionSignature),
        { equalityCheck: 'include' }
      );
      testQuickFixes(
        `FROM index | STATS avg(${BROKEN_PREFIX}${fn.name}())`,
        [fn.name].map(toFunctionSignature),
        { equalityCheck: 'include' }
      );
      testQuickFixes(
        `FROM index | STATS avg(numberField) BY ${BROKEN_PREFIX}${fn.name}()`,
        [fn.name].map(toFunctionSignature),
        { equalityCheck: 'include' }
      );
      testQuickFixes(
        `FROM index | STATS avg(numberField) BY var0 = ${BROKEN_PREFIX}${fn.name}()`,
        [fn.name].map(toFunctionSignature),
        { equalityCheck: 'include' }
      );
    }
    for (const fn of getAllFunctions({ type: 'agg' })) {
      // add an A to the function name to make it invalid
      testQuickFixes(
        `FROM index | STATS ${BROKEN_PREFIX}${fn.name}()`,
        [fn.name].map(toFunctionSignature),
        { equalityCheck: 'include' }
      );
      testQuickFixes(
        `FROM index | STATS var0 = ${BROKEN_PREFIX}${fn.name}()`,
        [fn.name].map(toFunctionSignature),
        { equalityCheck: 'include' }
      );
    }
    // it should preserve the arguments
    testQuickFixes(`FROM index | EVAL rAund(numberField)`, ['round(numberField)'], {
      equalityCheck: 'include',
    });
    testQuickFixes(`FROM index | STATS AVVG(numberField)`, ['avg(numberField)'], {
      equalityCheck: 'include',
    });
  });

  describe('fixing wrong quotes', () => {
    testQuickFixes(`FROM index | WHERE stringField like 'asda'`, ['"asda"']);
    testQuickFixes(`FROM index | WHERE stringField not like 'asda'`, ['"asda"']);
  });

  describe('fixing unquoted field names', () => {
    testQuickFixes('FROM index | DROP any#Char$Field', ['`any#Char$Field`']);
    testQuickFixes('FROM index | DROP numberField, any#Char$Field', ['`any#Char$Field`']);
  });

  describe('callbacks', () => {
    it('should not crash if callback functions are not passed', async () => {
      const callbackMocks = getCallbackMocks();
      const statement = `from a | eval b  = a | enrich policy | dissect stringField "%{firstWord}"`;
      const { model, range } = createModelAndRange(statement);
      const { errors } = await validateAst(statement, getAstAndErrors, callbackMocks);
      const monacoErrors = wrapAsMonacoMessage('error', statement, errors);
      const context = createMonacoContext(monacoErrors);
      try {
        await getActions(model, range, context, getAstAndErrors, {
          getFieldsFor: undefined,
          getSources: undefined,
          getPolicies: undefined,
          getMetaFields: undefined,
        });
      } catch {
        fail('Should not throw');
      }
    });

    it('should not crash no callbacks are passed', async () => {
      const callbackMocks = getCallbackMocks();
      const statement = `from a | eval b  = a | enrich policy | dissect stringField "%{firstWord}"`;
      const { model, range } = createModelAndRange(statement);
      const { errors } = await validateAst(statement, getAstAndErrors, callbackMocks);
      const monacoErrors = wrapAsMonacoMessage('error', statement, errors);
      const context = createMonacoContext(monacoErrors);
      try {
        await getActions(model, range, context, getAstAndErrors, undefined);
      } catch {
        fail('Should not throw');
      }
    });
  });
});
