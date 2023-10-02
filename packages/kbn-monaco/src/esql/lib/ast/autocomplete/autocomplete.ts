/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { monaco } from '../../../../monaco_imports';
import {
  buildFieldsDefinitions,
  buildSourcesDefinitions,
  pipeDefinition,
  processingCommandsDefinitions,
  sourceCommandsDefinitions,
} from '../../autocomplete/autocomplete_definitions';
import {
  getCompatibleFunctionDefinition,
  mathCommandDefinition,
} from '../../autocomplete/autocomplete_definitions/functions_commands';
import {
  AutocompleteCommandDefinition,
  ESQLCustomAutocompleteCallbacks,
} from '../../autocomplete/types';
import { commandDefinitions } from '../definitions/commands';
import {
  getCommandOrOptionsSignature,
  getCompatibleLiterals,
  getFunctionSignatures,
} from '../definitions/helpers';
import { getFunctionDefinition, monacoPositionToOffset } from '../helpers';
import { ESQLAst, ESQLAstItem, ESQLCommand, ESQLFunction, ESQLSingleAstItem } from '../types';

const EDITOR_MARKER = 'marker_esql_editor';

function findNode(nodes: ESQLAstItem[], offset: number): ESQLSingleAstItem | undefined {
  for (const node of nodes) {
    if (Array.isArray(node)) {
      const ret = findNode(node, offset);
      if (ret) {
        return ret;
      }
    } else {
      if (node.location.min <= offset && node.location.max >= offset) {
        if ('args' in node) {
          const ret = findNode(node.args, offset);
          // if the found node is the marker, then return its parent
          if (ret?.text === EDITOR_MARKER) {
            return node;
          }
          if (ret) {
            return ret;
          }
        }
        return node;
      }
    }
  }
}

function findCommand(ast: ESQLAst, offset: number) {
  const commandIndex = ast.findIndex(
    ({ location }) => location.min <= offset && location.max >= offset
  );
  return ast[commandIndex] || ast[ast.length - 1];
}

function findAstPosition(ast: ESQLAst, offset: number) {
  const command = findCommand(ast, offset);
  if (!command) {
    return { command: undefined, node: undefined };
  }
  const node = findNode(command.args, offset);
  return { command, node };
}

function getContext(innerText: string, ast: ESQLAst, offset: number) {
  const { command, node } = findAstPosition(ast, offset);

  if (node) {
    if (node.type === 'function' && ['in', 'not_in'].includes(node.name)) {
      // command ... a in ( <here> )
      return { type: 'list' as const, command, node };
    }
    if (node.type === 'function') {
      //   // command ... fn( <here> )
      return { type: 'function' as const, command, node };
    }
  }
  if (!command || (innerText.length <= offset && getLastCharFromTrimmed(innerText) === '|')) {
    //   // ... | <here>
    return { type: 'newCommand' as const, command: undefined, node: undefined };
  }

  if (['eval', 'stats', 'where'].includes(command.name)) {
    // command a ... <here> OR command a = ... <here>
    return { type: 'expression' as const, command, node };
  }
  if (['from', 'keep', 'drop'].includes(command.name)) {
    return { type: 'identifier' as const, command, node };
  }

  return { type: 'unknown' as const, command, node };
}

function getFinalSuggestions({ comma }: { comma?: boolean } = { comma: true }) {
  const finalSuggestions = [pipeDefinition];
  if (comma) {
    finalSuggestions.push({
      label: ',',
      insertText: ',',
      kind: 1,
      detail: i18n.translate('monaco.esql.autocomplete.commaDoc', {
        defaultMessage: 'Comma (,)',
      }),
      sortText: 'B',
    });
  }
  return finalSuggestions;
}

function getOptions(command: ESQLCommand): AutocompleteCommandDefinition[] {
  if (command.args.some((arg) => !Array.isArray(arg) && arg.type === 'option')) {
    return [];
  }
  // get possible options for the given command
  // console.log('Options!');
  return [];
}

function getLastCharFromTrimmed(text: string) {
  return text[text.trimEnd().length - 1];
}

function isMathFunction(char: string) {
  return ['+', '-', '*', '/', '%', '='].some((op) => char === op);
}

function isComma(char: string) {
  return char === ',';
}

export function getSignatureHelp(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.SignatureHelpContext,
  astProvider: (text: string | undefined) => { ast: ESQLAst }
): monaco.languages.SignatureHelpResult {
  const innerText = model.getValue();
  const offset = monacoPositionToOffset(innerText, position);
  let finalText = innerText;
  // if it's a comma by the user or a forced trigger by a function argument suggestion
  // add a marker to make the expression still valid
  if (
    context.triggerCharacter === ',' ||
    (context.triggerCharacter === ' ' &&
      (isMathFunction(innerText[offset - 2]) || isComma(innerText[offset - 2])))
  ) {
    finalText = `${innerText.substring(0, offset)}${EDITOR_MARKER}${innerText.substring(offset)}`;
  }

  const { ast } = astProvider(finalText);

  const triggerContext = getContext(innerText, ast, offset);
  if (triggerContext.type === 'function') {
    const fnDefinition = getFunctionDefinition(triggerContext.node.name);
    if (fnDefinition) {
      const argIndex = Math.max(triggerContext.node.args.length - 1, 0);
      const fullSignatures = getFunctionSignatures(fnDefinition);
      return {
        value: {
          // remove the documentation
          signatures: [
            {
              label: fullSignatures[0].declaration,
              documentation: {
                value: fnDefinition.description,
              },
              parameters: fnDefinition.signatures[0].params.map(({ name, type, optional }) => ({
                label: name,
                documentation: optional
                  ? i18n.translate('monaco.esql.signatureHelp.optionalArgument', {
                      defaultMessage: '{type}. Optional argument.',
                      values: {
                        type: Array.isArray(type) ? type.join(', ') : type,
                      },
                    })
                  : '',
              })),
            },
          ],
          activeParameter: argIndex,
          activeSignature: 0,
        },
        dispose: () => {},
      };
    }
  } else if (triggerContext.command) {
    const command = commandDefinitions.find(({ name }) => name === triggerContext.command.name)!;
    const parameters = [
      ...command.signature.params.map(({ name, type }) => {
        return { label: name, documentation: type !== 'any' ? '' : type };
      }),
      ...command.options.flatMap(({ name, signature, optional }) => {
        const option = [{ label: name, documentation: optional ? 'Optional' : '' }];
        for (const arg of signature.params) {
          option.push({
            label: arg.name,
            documentation: `${arg.optional ? 'Optional.' : ''}${arg.type}`,
          });
        }
        return option;
      }),
    ];
    const realArg = triggerContext.command.args[triggerContext.command.args.length - 1];
    const argIndex =
      realArg && !Array.isArray(realArg) && realArg.type === 'option'
        ? command.signature.params.length + 1
        : triggerContext.command.args.length;
    return {
      value: {
        signatures: [
          {
            label: getCommandOrOptionsSignature(command),
            documentation: command.examples![0],
            parameters,
          },
        ],
        activeParameter: command.signature.multipleParams
          ? argIndex % command.signature.params.length
          : argIndex,
        activeSignature: 0,
      },
      dispose: () => {},
    };
  }
  return {
    value: { signatures: [], activeParameter: 0, activeSignature: 0 },
    dispose: () => {},
  };
}

export async function suggest(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.CompletionContext,
  astProvider: (text: string | undefined) => { ast: ESQLAst },
  resourceRetriever?: ESQLCustomAutocompleteCallbacks
): Promise<AutocompleteCommandDefinition[]> {
  const innerText = model.getValue();
  const offset = monacoPositionToOffset(innerText, position);
  let finalText = innerText;
  // if it's a comma by the user or a forced trigger by a function argument suggestion
  // add a marker to make the expression still valid
  if (
    context.triggerCharacter === ',' ||
    context.triggerKind === 0 ||
    (context.triggerCharacter === ' ' &&
      (isMathFunction(innerText[offset - 2]) || isComma(innerText[offset - 2])))
  ) {
    finalText = `${innerText.substring(0, offset)}${EDITOR_MARKER}${innerText.substring(offset)}`;
  }

  const { ast } = astProvider(finalText);

  const triggerContext = getContext(innerText, ast, offset);
  const getFieldsByType = getFieldsByTypeRetriever(resourceRetriever);
  const getSources = getSourcesRetriever(resourceRetriever);

  if (triggerContext.type === 'newCommand') {
    // propose main commands here
    // filter source commands if already defined
    const suggestions = sourceCommandsDefinitions.concat(processingCommandsDefinitions);
    if (ast.length) {
      return suggestions.filter((def) => !sourceCommandsDefinitions.includes(def));
    }
    return suggestions;
  }
  if (triggerContext.type === 'identifier') {
    return getIdentifierSuggestions(innerText, triggerContext.command, getSources, getFieldsByType);
  }
  if (triggerContext.type === 'expression') {
    // const types = triggerContext.command.args.length ? triggerContext.command.args[0]. : ['any'];
    // return getAllSuggestionsByType();
    return [];
  }
  if (triggerContext.type === 'list') {
    // behave like an expression but without assign
    return [];
  }
  if (triggerContext.type === 'function') {
    // behave like list
    return getFunctionArgsSuggestions(
      model,
      position,
      triggerContext.node,
      triggerContext.command,
      getFieldsByType
    );
  }

  console.log({ ast, triggerContext });
  throw Error(`Where am I?`);
}

function getFieldsByTypeRetriever(resourceRetriever?: ESQLCustomAutocompleteCallbacks) {
  return async (expectedType: string | string[] = 'any') => {
    const types = Array.isArray(expectedType) ? expectedType : [expectedType];
    const fieldsOfType = await resourceRetriever?.getFields?.();
    return buildFieldsDefinitions(
      fieldsOfType
        ?.filter(({ type }) => {
          const ts = Array.isArray(type) ? type : [type];
          return ts.some((t) => types[0] === 'any' || types.includes(t));
        })
        .map(({ name }) => name) || []
    );
  };
}

function getSourcesRetriever(resourceRetriever?: ESQLCustomAutocompleteCallbacks) {
  return async () => {
    return buildSourcesDefinitions((await resourceRetriever?.getSources?.()) || []);
  };
}

const TRIGGER_SUGGESTION_COMMAND = {
  title: 'Trigger Suggestion Dialog',
  id: 'editor.action.triggerSuggest',
};

async function getAllSuggestionsByType(
  types: string[],
  commandName: string,
  getFieldsByType: (type: string | string[]) => Promise<AutocompleteCommandDefinition[]>,
  {
    functions,
    fields,
    newVariables,
  }: { functions: boolean; newVariables: boolean; fields: boolean }
): Promise<AutocompleteCommandDefinition[]> {
  // if there's no content suggest a new variable, functions or fields
  // if there's a single identifier but not assign, suggest assign or math operations
  // if there's an assign already
  //   * suggest math functions or pipes if at the end of something
  //   * suggest options if supported
  //   * suggest functions or fields by type if after a math operation
  const filteredFieldsByType = (await (fields
    ? getFieldsByType(types)
    : [])) as AutocompleteCommandDefinition[];

  const suggestions = filteredFieldsByType.concat(
    functions ? getCompatibleFunctionDefinition(commandName, types) : [],
    getCompatibleLiterals(commandName, types) // literals are handled internally
  );

  // rewrite the sortText here to have literals first, then fields, last functions
  return suggestions.map(({ sortText, kind, ...rest }) => ({
    ...rest,
    kind,
    sortText: String.fromCharCode(97 - kind),
    command: TRIGGER_SUGGESTION_COMMAND,
  }));
}

async function getFunctionArgsSuggestions(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  fn: ESQLFunction,
  command: ESQLCommand,
  getFieldsByType: (type: string | string[]) => Promise<AutocompleteCommandDefinition[]>
): Promise<AutocompleteCommandDefinition[]> {
  const fnDefinition = getFunctionDefinition(fn.name);
  if (fnDefinition) {
    const argIndex = Math.max(fn.args.length - 1, 0);
    const types = fnDefinition.signatures.flatMap((signature) => signature.params[argIndex].type);
    const suggestions = await getAllSuggestionsByType(types, command.name, getFieldsByType, {
      functions: true,
      fields: true,
      newVariables: false,
    });

    const hasMoreMandatoryArgs =
      fnDefinition.signatures[0].params.filter(({ optional }) => !optional).length > argIndex + 1;

    return suggestions.map(({ insertText, ...rest }) => ({
      ...rest,
      insertText: hasMoreMandatoryArgs ? `${insertText},` : insertText,
    }));
  }
  return mathCommandDefinition;
}

async function getIdentifierSuggestions(
  innerText: string,
  command: ESQLCommand,
  getSources: () => Promise<AutocompleteCommandDefinition[]>,
  getFieldsByType: (type: string | string[]) => Promise<AutocompleteCommandDefinition[]>
): Promise<AutocompleteCommandDefinition[]> {
  // does the command has arguments?
  if (command.args.length) {
    if (getLastCharFromTrimmed(innerText) !== ',') {
      return getFinalSuggestions({ comma: true }).concat(getOptions(command));
    }
  }
  if (command.name === 'from') {
    // find out possible arguments for the command
    return getSources();
  }
  return getFieldsByType('any');
}
