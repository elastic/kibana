/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SUGGESTION_TYPE, suggest } from './timelion_expression_input_helpers';
import { getArgValueSuggestions } from '../helpers/arg_value_suggestions';
import { setIndexPatterns, setSavedObjectsClient } from '../helpers/plugin_services';
import { IndexPatternsContract } from 'src/plugins/data/public';
import { SavedObjectsClient } from 'kibana/public';
import { ITimelionFunction } from '../../../../../plugins/timelion/common/types';

describe('Timelion expression suggestions', () => {
  setIndexPatterns({} as IndexPatternsContract);
  setSavedObjectsClient({} as SavedObjectsClient);

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
