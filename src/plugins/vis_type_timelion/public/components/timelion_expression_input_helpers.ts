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

import { get, startsWith } from 'lodash';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';

import { Parser } from 'pegjs';

// @ts-ignore
import { parse } from '../_generated_/chain';

import { ArgValueSuggestions, FunctionArg, Location } from '../helpers/arg_value_suggestions';
import { ITimelionFunction, TimelionFunctionArgs } from '../../common/types';

export enum SUGGESTION_TYPE {
  ARGUMENTS = 'arguments',
  ARGUMENT_VALUE = 'argument_value',
  FUNCTIONS = 'functions',
}

function inLocation(cursorPosition: number, location: Location) {
  return cursorPosition >= location.min && cursorPosition <= location.max;
}

function getArgumentsHelp(
  functionHelp: ITimelionFunction | undefined,
  functionArgs: FunctionArg[] = []
) {
  if (!functionHelp) {
    return [];
  }

  // Do not provide 'inputSeries' as argument suggestion for chainable functions
  const argsHelp = functionHelp.chainable ? functionHelp.args.slice(1) : functionHelp.args.slice(0);

  // ignore arguments that are already provided in function declaration
  const functionArgNames = functionArgs.map((arg) => arg.name);
  return argsHelp.filter((arg) => !functionArgNames.includes(arg.name));
}

async function extractSuggestionsFromParsedResult(
  result: ReturnType<Parser['parse']>,
  cursorPosition: number,
  functionList: ITimelionFunction[],
  argValueSuggestions: ArgValueSuggestions
) {
  const activeFunc = result.functions.find(({ location }: { location: Location }) =>
    inLocation(cursorPosition, location)
  );

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
  const activeArg = activeFunc.arguments.find((argument: FunctionArg) => {
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
    if (get(activeArg, 'type') === 'namedArg') {
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
    const result = await parse(expression);

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
      const param = suggestion.name.split(':');

      if (param.length === 1 || param[1]) {
        insertText = `${param.length === 1 ? insertText : param[1]},`;
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
