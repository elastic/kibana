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

import _ from 'lodash';

export const SUGGESTION_TYPE = {
  ARGUMENTS: 'arguments',
  ARGUMENT_VALUE: 'argument_value',
  FUNCTIONS: 'functions',
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

function getArgumentsHelp(functionHelp, functionArgs = []) {
  if (!functionHelp) {
    return [];
  }

  // Do not provide 'inputSeries' as argument suggestion for chainable functions
  const argsHelp = functionHelp.chainable ? functionHelp.args.slice(1) : functionHelp.args.slice(0);

  // ignore arguments that are already provided in function declaration
  const functionArgNames = functionArgs.map((arg) => {
    return arg.name;
  });
  return argsHelp.filter((arg) => {
    return !functionArgNames.includes(arg.name);
  });
}

async function extractSuggestionsFromParsedResult(
  result,
  cursorPosition,
  functionList,
  argValueSuggestions
) {
  const activeFunc = result.functions.find((func) => {
    return cursorPosition >= func.location.min && cursorPosition < func.location.max;
  });

  if (!activeFunc) {
    return;
  }

  const functionHelp = functionList.find((func) => {
    return func.name === activeFunc.function;
  });

  // return function suggestion when cursor is outside of parentheses
  // location range includes '.', function name, and '('.
  const openParen = activeFunc.location.min + activeFunc.function.length + 2;
  if (cursorPosition < openParen) {
    return { list: [functionHelp], location: activeFunc.location, type: SUGGESTION_TYPE.FUNCTIONS };
  }

  // return argument value suggestions when cursor is inside argument value
  const activeArg = activeFunc.arguments.find((argument) => {
    return inLocation(cursorPosition, argument.location);
  });
  if (
    activeArg &&
    activeArg.type === 'namedArg' &&
    inLocation(cursorPosition, activeArg.value.location)
  ) {
    const { function: functionName, arguments: functionArgs } = activeFunc;

    const {
      name: argName,
      value: { text: partialInput },
    } = activeArg;

    let valueSuggestions;
    if (argValueSuggestions.hasDynamicSuggestionsForArgument(functionName, argName)) {
      valueSuggestions = await argValueSuggestions.getDynamicSuggestionsForArgument(
        functionName,
        argName,
        functionArgs,
        partialInput
      );
    } else {
      const { suggestions: staticSuggestions } = functionHelp.args.find((arg) => {
        return arg.name === activeArg.name;
      });
      valueSuggestions = argValueSuggestions.getStaticSuggestionsForInput(
        partialInput,
        staticSuggestions
      );
    }
    return {
      list: valueSuggestions,
      location: activeArg.value.location,
      type: SUGGESTION_TYPE.ARGUMENT_VALUE,
    };
  }

  // return argument suggestions
  const argsHelp = getArgumentsHelp(functionHelp, activeFunc.arguments);
  const argumentSuggestions = argsHelp.filter((arg) => {
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

export async function suggest(
  expression,
  functionList,
  Parser,
  cursorPosition,
  argValueSuggestions
) {
  try {
    const result = await Parser.parse(expression);
    return await extractSuggestionsFromParsedResult(
      result,
      cursorPosition,
      functionList,
      argValueSuggestions
    );
  } catch (e) {
    let message;
    try {
      // The grammar will throw an error containing a message if the expression is formatted
      // correctly and is prepared to accept suggestions. If the expression is not formatted
      // correctly the grammar will just throw a regular PEG SyntaxError, and this JSON.parse
      // attempt will throw an error.
      message = JSON.parse(e.message);
    } catch (e) {
      // The expression isn't correctly formatted, so JSON.parse threw an error.
      return;
    }

    switch (message.type) {
      case 'incompleteFunction': {
        let list;
        if (message.function) {
          // The user has start typing a function name, so we'll filter the list down to only
          // possible matches.
          list = functionList.filter((func) => _.startsWith(func.name, message.function));
        } else {
          // The user hasn't typed anything yet, so we'll just return the entire list.
          list = functionList;
        }
        return { list, location: message.location, type: SUGGESTION_TYPE.FUNCTIONS };
      }
      case 'incompleteArgument': {
        const { currentFunction: functionName, currentArgs: functionArgs } = message;
        const functionHelp = functionList.find((func) => func.name === functionName);
        return {
          list: getArgumentsHelp(functionHelp, functionArgs),
          location: message.location,
          type: SUGGESTION_TYPE.ARGUMENTS,
        };
      }
      case 'incompleteArgumentValue': {
        const { name: argName, currentFunction: functionName, currentArgs: functionArgs } = message;
        let valueSuggestions = [];
        if (argValueSuggestions.hasDynamicSuggestionsForArgument(functionName, argName)) {
          valueSuggestions = await argValueSuggestions.getDynamicSuggestionsForArgument(
            functionName,
            argName,
            functionArgs
          );
        } else {
          const functionHelp = functionList.find((func) => func.name === functionName);
          if (functionHelp) {
            const argHelp = functionHelp.args.find((arg) => arg.name === argName);
            if (argHelp && argHelp.suggestions) {
              valueSuggestions = argHelp.suggestions;
            }
          }
        }
        return {
          list: valueSuggestions,
          location: { min: cursorPosition, max: cursorPosition },
          type: SUGGESTION_TYPE.ARGUMENT_VALUE,
        };
      }
    }
  }
}

export function insertAtLocation(
  valueToInsert,
  destination,
  replacementRangeStart,
  replacementRangeEnd
) {
  // Insert the value at a location caret within the destination.
  const prefix = destination.slice(0, replacementRangeStart);
  const suffix = destination.slice(replacementRangeEnd, destination.length);
  const result = `${prefix}${valueToInsert}${suffix}`;
  return result;
}
