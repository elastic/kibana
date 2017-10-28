import _ from 'lodash';

export const SUGGESTION_TYPE = {
  ARGUMENTS: 'arguments',
  ARGUMENT_VALUE: 'argument_value',
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
    this.list = list.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      // names must be equal
      return 0;
    });
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

function inLocation(cursorPosition, location) {
  return cursorPosition >= location.min && cursorPosition <= location.max;
}

function extractSuggestionsFromParsed(result, cursorPosition, functionList) {
  const activeFunc = result.functions.find((func) => {
    return cursorPosition >= func.location.min && cursorPosition < func.location.max;
  });
  console.log("activeFunc", activeFunc);

  if (activeFunc) {
    const funcDefinition = functionList.find((func) => {
      return func.name === activeFunc.function;
    });

    // return function suggestion if cursor is outside of parentheses
    // location range includes '.', function name, and '('.
    const openParen = activeFunc.location.min + activeFunc.function.length + 2;
    if (cursorPosition < openParen) {
      return { list: [funcDefinition], functionLocation: activeFunc.location, type: SUGGESTION_TYPE.FUNCTIONS }
    }

    const args = funcDefinition.chainable ? funcDefinition.args.slice(1) : funcDefinition.args.slice(0);
    const activeArg = activeFunc.arguments.find((argument) => {
      return inLocation(cursorPosition, argument.location);
    });
    console.log("activeArg", activeArg);

    // return argument_value suggestions when cursor is inside agrument value
    if (activeArg && activeArg.type === 'namedArg' && inLocation(cursorPosition, activeArg.value.location)) {
      // TODO figure out how to build argument value suggestions list
      return null;
    }

    const argumentSuggestions = args.filter(arg => {
      if (_.get(activeArg, 'type') === 'namedArg') {
        return _.startsWith(arg.name, activeArg.name);
      } else if (activeArg) {
        return _.startsWith(arg.name, activeArg.text);
      }
      return true;
    });
    const location = activeArg ? activeArg.location : { min: cursorPosition - 1, max: cursorPosition };
    return { list: argumentSuggestions, functionLocation: location, type: SUGGESTION_TYPE.ARGUMENTS };
  }
}

export function suggest(expression, functionList, Parser, cursorPosition) {
  return new Promise((resolve, reject) => {
    try {
      console.log("expression", expression);
      console.log("cursor", cursorPosition);

      // We rely on the grammar to throw an error in order to suggest function(s).
      const result = Parser.parse(expression);

      const suggestions = extractSuggestionsFromParsed(result, cursorPosition, functionList);
      if (suggestions) {
        return resolve(suggestions);
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
          console.log(message);
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
        } else if (message.type === 'incompleteArgument') {
          // TODO figure out how to build argument value suggestions list
          return reject();
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
