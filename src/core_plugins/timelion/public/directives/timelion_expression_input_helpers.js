import _ from 'lodash';

export const SUGGESTION_TYPE = {
  ARGUMENTS: 'arguments',
  ARGUMENT: 'argument',
  FUNCTIONS: 'functions'
};

export class FunctionSuggestions {
  constructor() {
    this.reset();
  }

  reset() {
    this.index = -1;
    this.list = [];
    this.type;
    this.isVisible = false;
  }

  setList(list, type) {
    this.list = list;
    this.type = type;

    // Only try to position index inside of list range, when it was already focused
    // beforehand (i.e. not -1)
    if (this.index > -1) {
      // We may get a shorter list than the one we have now, so we need to make sure our index doesn't
      // fall outside of the new list's range.
      this.index = Math.max(0, Math.min(this.index, this.list.length - 1));
    }
  }

  getCount() {
    return this.list.length;
  }

  isEmpty() {
    return this.list.length === 0;
  }

  show() {
    this.isVisible = true;
  }

  hide() {
    this.isVisible = false;
  }

  stepForward() {
    if (this.index > 0) {
      this.index -= 1;
    }
  }

  stepBackward() {
    if (this.index < this.list.length - 1) {
      this.index += 1;
    }
  }
}

export function suggest(expression, functionList, Parser, cursorPosition) {
  return new Promise((resolve, reject) => {
    try {
      console.log("expression", expression);
      console.log("cursor", cursorPosition);

      // We rely on the grammar to throw an error in order to suggest function(s).
      const result = Parser.parse(expression);

      // If the grammar doesn't throw an error, then offer argument suggestions when cursor inside a function.
      const activeFunc = result.functions.find((func) => {
        // location range includes '.', function name, and '('. Only show arguments when cursor is inside parentheses
        const openParen = func.location.min + func.function.length + 2;
        return cursorPosition >= openParen && cursorPosition < func.location.max;
      });
      if (activeFunc) {
        console.log(activeFunc);
        const funcDef = functionList.find((func) => {
          return func.name === activeFunc.function;
        });
        console.log(funcDef);
        const args = funcDef.chainable ? funcDef.args.slice(1) : funcDef.args.slice(0);
        const activeArg = activeFunc.arguments.find((argument) => {
          return cursorPosition > argument.location.min && cursorPosition <= argument.location.max;
        });
        // TODO see if cursor is in value and pass argument suggestions
        let location;
        if (activeArg) {
          location = activeArg.location;
        } else {
          location = {
            min: cursorPosition - 1,
            max: cursorPosition
          };
        }
        return resolve({ list: args, functionLocation: location, type: SUGGESTION_TYPE.ARGUMENTS });
      }

      return reject();
    } catch (e) {
      try {
        // The grammar will throw an error containing a message if the expression is formatted
        // correctly and is prepared to accept suggestions. If the expression is not formmated
        // correctly the grammar will just throw a regular PEG SyntaxError, and this JSON.parse
        // attempt will throw an error.
        console.log(e);
        const message = JSON.parse(e.message);
        const functionLocation = message.location;
        console.log(functionLocation);

        if (message.type === 'incompleteFunction') {
          let list;

          if (message.function) {
            // The user has start typing a function name, so we'll filter the list down to only
            // possible matches.
            list = functionList.filter(func => _.startsWith(func.name, message.function));
          } else {
            // The user hasn't typed anything yet, so we'll just return the entire list.
            list = functionList;
          }

          return resolve({ list, functionLocation, type: SUGGESTION_TYPE.FUNCTIONS });
        }
      } catch (e) {
        // The expression isn't correctly formatted, so JSON.parse threw an error.
        return reject();
      }
    }
  });
}

export function insertAtLocation(valueToInsert, destination, replacementRangeStart, replacementRangeEnd) {
  // Insert the value at a location caret within the destination.
  const prefix = destination.slice(0, replacementRangeStart + 1);
  const suffix =  destination.slice(replacementRangeEnd, destination.length);
  const result = `${prefix}${valueToInsert}${suffix}`;
  return result;
}
