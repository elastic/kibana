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

import expect from '@kbn/expect';
import PEG from 'pegjs';
import grammar from 'raw-loader!../../chain.peg';
import { SUGGESTION_TYPE, suggest } from '../timelion_expression_input_helpers';
import { getArgValueSuggestions } from '../../services/arg_value_suggestions';

describe('Timelion expression suggestions', () => {
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
    };
    const myFunc2 = {
      name: 'myFunc2',
      chainable: false,
      args: [{ name: 'argA' }, { name: 'argAB' }, { name: 'argABC' }],
    };
    const functionList = [func1, myFunc2];
    let Parser;
    const argValueSuggestions = getArgValueSuggestions();
    beforeEach(function() {
      Parser = PEG.generate(grammar);
    });

    describe('parse exception', () => {
      describe('incompleteFunction', () => {
        it('should return function suggestions', async () => {
          const expression = '.';
          const cursorPosition = 1;
          const suggestions = await suggest(
            expression,
            functionList,
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: [func1, myFunc2],
            location: {
              min: 0,
              max: 1,
            },
            type: 'functions',
          });
        });
        it('should filter function suggestions by function name', async () => {
          const expression = '.myF';
          const cursorPosition = 4;
          const suggestions = await suggest(
            expression,
            functionList,
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: [myFunc2],
            location: {
              min: 0,
              max: 4,
            },
            type: 'functions',
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
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: [],
            location: {
              min: 11,
              max: 12,
            },
            type: 'arguments',
          });
        });

        it('should return argument suggestions when provided by help', async () => {
          const expression = '.myFunc2(=)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: myFunc2.args,
            location: {
              min: 9,
              max: 10,
            },
            type: 'arguments',
          });
        });

        it('should return argument suggestions when argument value provided', async () => {
          const expression = '.myFunc2(=whatArgumentAmI)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: myFunc2.args,
            location: {
              min: 9,
              max: 25,
            },
            type: 'arguments',
          });
        });

        it('should not show first argument for chainable functions', async () => {
          const expression = '.func1(=)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: [{ name: 'argA' }, { name: 'argAB', suggestions: [{ name: 'value1' }] }],
            location: {
              min: 7,
              max: 8,
            },
            type: 'arguments',
          });
        });

        it('should not provide argument suggestions for argument that is all ready set in function def', async () => {
          const expression = '.myFunc2(argAB=provided,=)';
          const cursorPosition = 0;
          const suggestions = await suggest(
            expression,
            functionList,
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: [{ name: 'argA' }, { name: 'argABC' }],
            location: {
              min: 24,
              max: 25,
            },
            type: 'arguments',
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
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: [],
            location: {
              min: 11,
              max: 11,
            },
            type: 'argument_value',
          });
        });

        it('should return argument value suggestions when provided by help', async () => {
          const expression = '.func1(argAB=)';
          const cursorPosition = 11;
          const suggestions = await suggest(
            expression,
            functionList,
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: [{ name: 'value1' }],
            location: {
              min: 11,
              max: 11,
            },
            type: 'argument_value',
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
            Parser,
            cursorPosition,
            argValueSuggestions
          );
          expect(suggestions).to.eql({
            list: [func1],
            location: {
              min: 0,
              max: 8,
            },
            type: 'functions',
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
              Parser,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).to.eql({
              list: myFunc2.args,
              location: {
                min: 9,
                max: 9,
              },
              type: 'arguments',
            });
          });
          it('should not provide argument suggestions for argument that is all ready set in function def', async () => {
            const expression = '.myFunc2(argAB=provided,)';
            const cursorPosition = 24;
            const suggestions = await suggest(
              expression,
              functionList,
              Parser,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions.type).to.equal(SUGGESTION_TYPE.ARGUMENTS);
            expect(suggestions).to.eql({
              list: [{ name: 'argA' }, { name: 'argABC' }],
              location: {
                min: 24,
                max: 24,
              },
              type: 'arguments',
            });
          });
          it('should filter argument suggestions by argument name', async () => {
            const expression = '.myFunc2(argAB,)';
            const cursorPosition = 14;
            const suggestions = await suggest(
              expression,
              functionList,
              Parser,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).to.eql({
              list: [{ name: 'argAB' }, { name: 'argABC' }],
              location: {
                min: 9,
                max: 14,
              },
              type: 'arguments',
            });
          });
          it('should not show first argument for chainable functions', async () => {
            const expression = '.func1()';
            const cursorPosition = 7;
            const suggestions = await suggest(
              expression,
              functionList,
              Parser,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).to.eql({
              list: [{ name: 'argA' }, { name: 'argAB', suggestions: [{ name: 'value1' }] }],
              location: {
                min: 7,
                max: 7,
              },
              type: 'arguments',
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
              Parser,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).to.eql({
              list: [],
              location: {
                min: 14,
                max: 16,
              },
              type: 'argument_value',
            });
          });

          it('should return no argument value suggestions when provided by help', async () => {
            const expression = '.func1(argAB=val)';
            const cursorPosition = 16;
            const suggestions = await suggest(
              expression,
              functionList,
              Parser,
              cursorPosition,
              argValueSuggestions
            );
            expect(suggestions).to.eql({
              list: [{ name: 'value1' }],
              location: {
                min: 13,
                max: 16,
              },
              type: 'argument_value',
            });
          });
        });
      });
    });
  });
});
