import expect from 'expect.js';
import PEG from 'pegjs';
import grammar from 'raw!../../chain.peg';
import {
  SUGGESTION_TYPE,
  suggest
} from '../timelion_expression_input_helpers';

describe('Timelion expression suggestions', () => {

  describe('getSuggestions', () => {
    const functionList = [
      {
        name: 'func1',
        chainable: true,
        args: [
          { name: 'inputSeries' },
          { name: 'argA' },
          { name: 'argAB' }
        ]
      },
      {
        name: 'myFunc2',
        chainable: false,
        args: [
          { name: 'argA' },
          { name: 'argAB' },
          { name: 'argABC' }
        ]
      }
    ];
    let Parser;
    beforeEach(function () {
      Parser = PEG.buildParser(grammar);
    });

    describe('parse exception', () => {

      describe('incompleteFunction', () => {
        it('should return function suggestions', async () => {
          const expression = '.';
          const cursorPosition = 1;
          const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
          expect(suggestions.type).to.equal(SUGGESTION_TYPE.FUNCTIONS);
          expect(suggestions.list.length).to.equal(2);
          expect(suggestions.list[0].name).to.equal('func1');
          expect(suggestions.location.min).to.equal(0);
          expect(suggestions.location.max).to.equal(1);
        });
        it('should filter function suggestions by function name', async () => {
          const expression = '.myF';
          const cursorPosition = 4;
          const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
          expect(suggestions.type).to.equal(SUGGESTION_TYPE.FUNCTIONS);
          expect(suggestions.list.length).to.equal(1);
          expect(suggestions.list[0].name).to.equal('myFunc2');
          expect(suggestions.location.min).to.equal(0);
          expect(suggestions.location.max).to.equal(4);
        });
      });

      describe('incompleteArgument', () => {
        it('should return argument value suggestions', async () => {
          const expression = '.func1(argA=)';
          const cursorPosition = 11;
          const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
          expect(suggestions.type).to.equal(SUGGESTION_TYPE.ARGUMENT_VALUE);
          expect(suggestions.list.length).to.equal(0);
          expect(suggestions.location.min).to.equal(7);
          expect(suggestions.location.max).to.equal(12);
        });
      });

    });

    describe('parse cleanly', () => {
      describe('cursor in function name', () => {
        it('should return function suggestion when cursor is over function name', async () => {
          const expression = '.func1()';
          const cursorPosition = 1;
          const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
          expect(suggestions.type).to.equal(SUGGESTION_TYPE.FUNCTIONS);
          expect(suggestions.list.length).to.equal(1);
          expect(suggestions.list[0].name).to.equal('func1');
          expect(suggestions.location.min).to.equal(0);
          expect(suggestions.location.max).to.equal(8);
        });
      });

      describe('cursor in function parentheses', () => {
        describe('cursor in argument name', () => {
          it('should return argument suggestions', async () => {
            const expression = '.myFunc2()';
            const cursorPosition = 9;
            const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
            expect(suggestions.type).to.equal(SUGGESTION_TYPE.ARGUMENTS);
            expect(suggestions.list.length).to.equal(3);
            expect(suggestions.list[0].name).to.equal('argA');
            expect(suggestions.location.min).to.equal(9);
            expect(suggestions.location.max).to.equal(9);
          });
          it('should not provide argument suggestions for argument that is all ready set in function def', async () => {
            const expression = '.myFunc2(argAB=provided,)';
            const cursorPosition = 24;
            const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
            expect(suggestions.type).to.equal(SUGGESTION_TYPE.ARGUMENTS);
            expect(suggestions.list.length).to.equal(2);
            expect(suggestions.list[0].name).to.equal('argA');
            expect(suggestions.list[1].name).to.equal('argABC');
          });
          it('should filter argument suggestions provided arguments', async () => {
            const expression = '.myFunc2(argAB,)';
            const cursorPosition = 14;
            const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
            expect(suggestions.type).to.equal(SUGGESTION_TYPE.ARGUMENTS);
            expect(suggestions.list.length).to.equal(2);
            expect(suggestions.list[0].name).to.equal('argAB');
            expect(suggestions.location.min).to.equal(9);
            expect(suggestions.location.max).to.equal(14);
          });
          it('should not show first argument for chainable functions', async () => {
            const expression = '.func1()';
            const cursorPosition = 7;
            const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
            expect(suggestions.type).to.equal(SUGGESTION_TYPE.ARGUMENTS);
            expect(suggestions.list.length).to.equal(2);
            expect(suggestions.list[0].name).to.equal('argA');
          });
        });
        describe('cursor in argument value', () => {
          it('should return argument value suggestions', async () => {
            const expression = '.myFunc2(argA=42)';
            const cursorPosition = 14;
            const suggestions = await suggest(expression, functionList, Parser, cursorPosition);
            expect(suggestions.type).to.equal(SUGGESTION_TYPE.ARGUMENT_VALUE);
            expect(suggestions.list.length).to.equal(0);
            expect(suggestions.location.min).to.equal(14);
            expect(suggestions.location.max).to.equal(16);
          });
        });
      });
    });

  });

});
