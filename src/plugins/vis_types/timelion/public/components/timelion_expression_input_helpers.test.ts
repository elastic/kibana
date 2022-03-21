/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SUGGESTION_TYPE, suggest } from './timelion_expression_input_helpers';
import { getArgValueSuggestions } from '../helpers/arg_value_suggestions';
import { setIndexPatterns } from '../helpers/plugin_services';
import { DataViewsContract } from 'src/plugins/data_views/public';
import { ITimelionFunction } from '../../common/types';

describe('Timelion expression suggestions', () => {
  setIndexPatterns({} as DataViewsContract);

  const argValueSuggestions = getArgValueSuggestions();

  describe('getSuggestions', () => {
    const func1 = {
      name: 'func1',
      chainable: true,
      args: [
        { name: 'inputSeries' },
        { name: 'argA' },
        {
          name: 'argAB',
          suggestions: [{ name: 'value1' }],
        },
      ],
    } as ITimelionFunction;
    const myFunc2 = {
      name: 'myFunc2',
      chainable: false,
      args: [{ name: 'argA' }, { name: 'argAB' }, { name: 'argABC' }],
    } as ITimelionFunction;
    const functionList = [func1, myFunc2];

    describe('parse exception', () => {
      describe('incompleteFunction', () => {
        it('should return function suggestions', async () => {
          const expression = '.';
          const cursorPosition = 1;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: [func1, myFunc2],
            type: SUGGESTION_TYPE.FUNCTIONS,
          });
        });
        it('should filter function suggestions by function name', async () => {
          const expression = '.myF';
          const cursorPosition = 4;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: [myFunc2],
            type: SUGGESTION_TYPE.FUNCTIONS,
          });
        });
      });

      describe('no argument name provided', () => {
        it('should return no argument suggestions when none provided by help', async () => {
          const expression = '.otherFunc(=)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: [],
            type: SUGGESTION_TYPE.ARGUMENTS,
          });
        });

        it('should return argument suggestions when provided by help', async () => {
          const expression = '.myFunc2(=)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: myFunc2.args,
            type: SUGGESTION_TYPE.ARGUMENTS,
          });
        });

        it('should return argument suggestions when argument value provided', async () => {
          const expression = '.myFunc2(=whatArgumentAmI)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: myFunc2.args,
            type: SUGGESTION_TYPE.ARGUMENTS,
          });
        });

        it('should not show first argument for chainable functions', async () => {
          const expression = '.func1(=)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: [{ name: 'argA' }, { name: 'argAB', suggestions: [{ name: 'value1' }] }],
            type: SUGGESTION_TYPE.ARGUMENTS,
          });
        });

        it('should not provide argument suggestions for argument that is all ready set in function def', async () => {
          const expression = '.myFunc2(argAB=provided,=)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: [{ name: 'argA' }, { name: 'argABC' }],
            type: SUGGESTION_TYPE.ARGUMENTS,
          });
        });
      });

      describe('no argument value provided', () => {
        it('should return no argument value suggestions when not provided by help', async () => {
          const expression = '.func1(argA=)';
          const cursorPosition = 11;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: [],
            type: SUGGESTION_TYPE.ARGUMENT_VALUE,
          });
        });

        it('should return argument value suggestions when provided by help', async () => {
          const expression = '.func1(argAB=)';
          const cursorPosition = 11;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: [{ name: 'value1' }],
            type: SUGGESTION_TYPE.ARGUMENT_VALUE,
          });
        });
      });
    });

    describe('parse cleanly', () => {
      describe('cursor in function name', () => {
        it('should return function suggestion', async () => {
          const expression = '.func1()';
          const cursorPosition = 1;
          const suggestions = await suggest(
            expression,
            functionList,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).toEqual({
            list: [func1],
            type: SUGGESTION_TYPE.FUNCTIONS,
          });
        });
      });

      describe('cursor in function parentheses', () => {
        describe('cursor in argument name', () => {
          it('should return argument suggestions', async () => {
            const expression = '.myFunc2()';
            const cursorPosition = 9;
            const suggestions = await suggest(
              expression,
              functionList,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).toEqual({
              list: myFunc2.args,
              type: SUGGESTION_TYPE.ARGUMENTS,
            });
          });
          it('should not provide argument suggestions for argument that is all ready set in function def', async () => {
            const expression = '.myFunc2(argAB=provided,)';
            const cursorPosition = 24;
            const suggestions = await suggest(
              expression,
              functionList,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).toEqual({
              list: [{ name: 'argA' }, { name: 'argABC' }],
              type: SUGGESTION_TYPE.ARGUMENTS,
            });
          });
          it('should filter argument suggestions by argument name', async () => {
            const expression = '.myFunc2(argAB,)';
            const cursorPosition = 14;
            const suggestions = await suggest(
              expression,
              functionList,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).toEqual({
              list: [{ name: 'argAB' }, { name: 'argABC' }],
              type: SUGGESTION_TYPE.ARGUMENTS,
            });
          });
          it('should not show first argument for chainable functions', async () => {
            const expression = '.func1()';
            const cursorPosition = 7;
            const suggestions = await suggest(
              expression,
              functionList,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).toEqual({
              list: [{ name: 'argA' }, { name: 'argAB', suggestions: [{ name: 'value1' }] }],
              type: SUGGESTION_TYPE.ARGUMENTS,
            });
          });
        });
        describe('cursor in argument value', () => {
          it('should return no argument value suggestions when not provided by help', async () => {
            const expression = '.myFunc2(argA=42)';
            const cursorPosition = 14;
            const suggestions = await suggest(
              expression,
              functionList,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).toEqual({
              list: [],
              type: SUGGESTION_TYPE.ARGUMENT_VALUE,
            });
          });

          it('should return no argument value suggestions when provided by help', async () => {
            const expression = '.func1(argAB=val)';
            const cursorPosition = 16;
            const suggestions = await suggest(
              expression,
              functionList,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).toEqual({
              list: [{ name: 'value1' }],
              type: SUGGESTION_TYPE.ARGUMENT_VALUE,
            });
          });
        });
      });
    });
  });
});
