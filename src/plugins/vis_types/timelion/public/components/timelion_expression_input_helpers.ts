/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { startsWith } from 'lodash';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { parseTimelionExpressionAsync } from '../../common/parser_async';
import type {
  ParsedExpression,
  TimelionExpressionArgument,
  ExpressionLocation,
} from '../../common/parser';

import { ArgValueSuggestions } from '../helpers/arg_value_suggestions';
import { ITimelionFunction, TimelionFunctionArgs } from '../../common/types';

export enum SUGGESTION_TYPE {
  ARGUMENTS = 'arguments',
  ARGUMENT_VALUE = 'argument_value',
  FUNCTIONS = 'functions',
}

function inLocation(cursorPosition: number, location: ExpressionLocation) {
  return cursorPosition >= location.min && cursorPosition <= location.max;
}

function getArgumentsHelp(
  functionHelp: ITimelionFunction | undefined,
  functionArgs: TimelionExpressionArgument[] = []
) {
  if (!functionHelp) {
    return [];
  }

  // Do not provide 'inputSeries' as argument suggestion for chainable functions
  const argsHelp = functionHelp.chainable ? functionHelp.args.slice(1) : functionHelp.args.slice(0);

  // ignore arguments that are already provided in function declaration
  const functionArgNames = functionArgs.map((arg) => arg.name);
  return argsHelp.filter((arg) => !arg.hidden && !functionArgNames.includes(arg.name));
}

async function extractSuggestionsFromParsedResult(
  result: ParsedExpression,
  cursorPosition: number,
  functionList: ITimelionFunction[],
  argValueSuggestions: ArgValueSuggestions
) {
  const activeFunc = result.functions.find(({ location }) => inLocation(cursorPosition, location));

  if (!activeFunc) {
    return;
  }

  const functionHelp = functionList.find(({ name }) => name === activeFunc.function);

  if (!functionHelp) {
    return;
  }

  // return function suggestion when cursor is outside of parentheses
  // location range includes '.', function name, and '('.
  const openParen = activeFunc.location.min + activeFunc.function.length + 2;
  if (cursorPosition < openParen) {
    return { list: [functionHelp], type: SUGGESTION_TYPE.FUNCTIONS };
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
      const { suggestions: staticSuggestions } =
        functionHelp.args.find((arg) => arg.name === activeArg.name) || {};
      valueSuggestions = argValueSuggestions.getStaticSuggestionsForInput(
        partialInput,
        staticSuggestions
      );
    }
    return {
      list: valueSuggestions,
      type: SUGGESTION_TYPE.ARGUMENT_VALUE,
    };
  }

  // return argument suggestions
  const argsHelp = getArgumentsHelp(functionHelp, activeFunc.arguments);
  const argumentSuggestions = argsHelp.filter((arg) => {
    if (activeArg?.type === 'namedArg') {
      return startsWith(arg.name, activeArg.name);
    } else if (activeArg) {
      return startsWith(arg.name, activeArg.text);
    }
    return true;
  });
  return { list: argumentSuggestions, type: SUGGESTION_TYPE.ARGUMENTS };
}

export async function suggest(
  expression: string,
  functionList: ITimelionFunction[],
  cursorPosition: number,
  argValueSuggestions: ArgValueSuggestions
) {
  try {
    const result = await parseTimelionExpressionAsync(expression);

    return await extractSuggestionsFromParsedResult(
      result,
      cursorPosition,
      functionList,
      argValueSuggestions
    );
  } catch (err) {
    let message: any;
    try {
      // The grammar will throw an error containing a message if the expression is formatted
      // correctly and is prepared to accept suggestions. If the expression is not formatted
      // correctly the grammar will just throw a regular PEG SyntaxError, and this JSON.parse
      // attempt will throw an error.
      message = JSON.parse(err.message);
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
          list = functionList.filter((func) => startsWith(func.name, message.function));
        } else {
          // The user hasn't typed anything yet, so we'll just return the entire list.
          list = functionList;
        }
        return { list, type: SUGGESTION_TYPE.FUNCTIONS };
      }
      case 'incompleteArgument': {
        const { currentFunction: functionName, currentArgs: functionArgs } = message;
        const functionHelp = functionList.find((func) => func.name === functionName);
        return {
          list: getArgumentsHelp(functionHelp, functionArgs),
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
          type: SUGGESTION_TYPE.ARGUMENT_VALUE,
        };
      }
    }
  }
}

export function getSuggestion(
  suggestion: ITimelionFunction | TimelionFunctionArgs,
  type: SUGGESTION_TYPE,
  range: monaco.Range
): monaco.languages.CompletionItem {
  let kind: monaco.languages.CompletionItemKind = monaco.languages.CompletionItemKind.Method;
  let insertText: string = suggestion.name;
  let insertTextRules: monaco.languages.CompletionItem['insertTextRules'];
  let detail: string = '';
  let command: monaco.languages.CompletionItem['command'];

  switch (type) {
    case SUGGESTION_TYPE.ARGUMENTS:
      command = {
        title: 'Trigger Suggestion Dialog',
        id: 'editor.action.triggerSuggest',
      };
      kind = monaco.languages.CompletionItemKind.Property;
      insertText = `${insertText}=`;
      detail = `${i18n.translate(
        'timelion.expressionSuggestions.argument.description.acceptsText',
        {
          defaultMessage: 'Accepts',
        }
      )}: ${(suggestion as TimelionFunctionArgs).types}`;

      break;
    case SUGGESTION_TYPE.FUNCTIONS:
      command = {
        title: 'Trigger Suggestion Dialog',
        id: 'editor.action.triggerSuggest',
      };
      kind = monaco.languages.CompletionItemKind.Function;
      insertText = `${insertText}($0)`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      detail = `(${
        (suggestion as ITimelionFunction).chainable
          ? i18n.translate('timelion.expressionSuggestions.func.description.chainableHelpText', {
              defaultMessage: 'Chainable',
            })
          : i18n.translate('timelion.expressionSuggestions.func.description.dataSourceHelpText', {
              defaultMessage: 'Data source',
            })
      })`;

      break;
    case SUGGESTION_TYPE.ARGUMENT_VALUE:
      const defaultText = (suggestion as TimelionFunctionArgs).insertText;
      if (defaultText) {
        insertText = `${defaultText},`;
      }

      command = {
        title: 'Trigger Suggestion Dialog',
        id: 'editor.action.triggerSuggest',
      };
      kind = monaco.languages.CompletionItemKind.Property;
      detail = suggestion.help || '';

      break;
  }

  return {
    detail,
    insertText,
    insertTextRules,
    kind,
    label: suggestion.name,
    documentation: suggestion.help,
    command,
    range,
  };
}
