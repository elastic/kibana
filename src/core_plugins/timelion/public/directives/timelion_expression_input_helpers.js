import _ from 'lodash';

export const SUGGESTION_TYPE = {
  ARGUMENTS: 'arguments',
  ARGUMENT_VALUE: 'argument_value',
  FUNCTIONS: 'functions'
};

export class Suggestions {
  constructor() {
    this.reset();
  }

  reset() {
    this.index = -1;
    this.list = [];
    this.type = null;
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

function extractSuggestionsFromParsedResult(result, cursorPosition, functionList) {
  const activeFunc = result.functions.find((func) => {
    return cursorPosition >= func.location.min && cursorPosition < func.location.max;
  });

  if (!activeFunc) {
    return;
  }

  const funcDefinition = functionList.find((func) => {
    return func.name === activeFunc.function;
  });
  const providedArguments = activeFunc.arguments.map((arg) => {
    return arg.name;
  });

  // return function suggestion if cursor is outside of parentheses
  // location range includes '.', function name, and '('.
  const openParen = activeFunc.location.min + activeFunc.function.length + 2;
  if (cursorPosition < openParen) {
    return { list: [funcDefinition], location: activeFunc.location, type: SUGGESTION_TYPE.FUNCTIONS };
  }

  // Do not provide 'inputSeries' as argument suggestion for chainable functions
  const args = funcDefinition.chainable ? funcDefinition.args.slice(1) : funcDefinition.args.slice(0);

  const activeArg = activeFunc.arguments.find((argument) => {
    return inLocation(cursorPosition, argument.location);
  });
  // return argument_value suggestions when cursor is inside agrument value
  if (activeArg && activeArg.type === 'namedArg' && inLocation(cursorPosition, activeArg.value.location)) {
    // TODO - provide argument value suggestions once function list contains required data
    return { list: [], location: activeArg.value.location, type: SUGGESTION_TYPE.ARGUMENT_VALUE };
  }

  const argumentSuggestions = args.filter(arg => {
    // ignore arguments that are all ready provided in function declaration
    if (providedArguments.includes(arg.name)) {
      return false;
    }

    if (_.get(activeArg, 'type') === 'namedArg') {
      return _.startsWith(arg.name, activeArg.name);
    } else if (activeArg) {
      return _.startsWith(arg.name, activeArg.text);
    }
    return true;
  });
  const location = activeArg ? activeArg.location : { min: cursorPosition, max: cursorPosition };
  return { list: argumentSuggestions, location: location, type: SUGGESTION_TYPE.ARGUMENTS };
}

export async function suggest(expression, functionList, Parser, cursorPosition, getArgValueSuggestions) {
  try {
    // We rely on the grammar to throw an error in order to suggest function(s).
    const result = await Parser.parse(expression);

    const suggestions = extractSuggestionsFromParsedResult(result, cursorPosition, functionList);
    if (suggestions) {
      return suggestions;
    }

    return;
  } catch (e) {
    try {
      // The grammar will throw an error containing a message if the expression is formatted
      // correctly and is prepared to accept suggestions. If the expression is not formmated
      // correctly the grammar will just throw a regular PEG SyntaxError, and this JSON.parse
      // attempt will throw an error.
      const message = JSON.parse(e.message);
      const location = message.location;

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

        return { list, location, type: SUGGESTION_TYPE.FUNCTIONS };
      } else if (message.type === 'incompleteArgument') {

        const functionHelp = functionList.find((func) => {
          return func.name === message.currentFunction;
        });
        let argHelp;
        if (functionHelp) {
          argHelp = functionHelp.args.find((arg) => {
            return arg.name === message.name;
          });
        }

        const valueSuggestions = await getArgValueSuggestions(message.name, null, argHelp, message.currentFunction, message.currentArgs);
        return {
          list: valueSuggestions,
          location: { min: cursorPosition, max: cursorPosition },
          type: SUGGESTION_TYPE.ARGUMENT_VALUE };
      }

    } catch (e) {
      // The expression isn't correctly formatted, so JSON.parse threw an error.
      return;
    }
  }
}

export function insertAtLocation(valueToInsert, destination, replacementRangeStart, replacementRangeEnd) {
  // Insert the value at a location caret within the destination.
  const prefix = destination.slice(0, replacementRangeStart);
  const suffix =  destination.slice(replacementRangeEnd, destination.length);
  const result = `${prefix}${valueToInsert}${suffix}`;
  return result;
}
