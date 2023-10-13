/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '../../../../monaco_imports';
import type { AutocompleteCommandDefinition, ESQLCallbacks } from './types';
import { nonNullable } from '../ast_walker';
import {
  getColumnHit,
  getCommandDefinition,
  getCommandOption,
  getFunctionDefinition,
  isColumnItem,
  isFunctionItem,
  isIncompleteItem,
  isLiteralItem,
  isOptionItem,
  isSourceItem,
  monacoPositionToOffset,
} from '../shared/helpers';
import { collectVariables } from '../shared/variables';
import {
  ESQLAst,
  ESQLAstItem,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLSingleAstItem,
} from '../types';
import type { ESQLPolicy, ESQLRealField, ESQLVariable } from '../validation/types';
import {
  commandAutocompleteDefinitions,
  getAssignmentDefinitionCompletitionItem,
  getBuiltinCompatibleFunctionDefinition,
  mathCommandDefinition,
  pipeCompleteItem,
} from './completeItems';
import {
  buildFieldsDefinitions,
  buildPoliciesDefinitions,
  buildSourcesDefinitions,
  buildNewVarDefinition,
  buildNoPoliciesAvailableDefinition,
  getCompatibleFunctionDefinition,
  buildMatchingFieldsDefinition,
  getCompatibleLiterals,
  buildConstantsDefinitions,
} from './factories';

const EDITOR_MARKER = 'marker_esql_editor';

type GetSourceFn = () => Promise<AutocompleteCommandDefinition[]>;
type GetFieldsByTypeFn = (type: string | string[]) => Promise<AutocompleteCommandDefinition[]>;
type GetFieldsMapFn = () => Promise<Map<string, ESQLRealField>>;
type GetPoliciesFn = () => Promise<AutocompleteCommandDefinition[]>;
type GetPolicyMetadataFn = (name: string) => Promise<ESQLPolicy | undefined>;

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
      // command ... fn( <here> )
      return { type: 'function' as const, command, node };
    }
    if (node.type === 'option') {
      // command ... by <here>
      return { type: 'option' as const, command, node };
    }
  }
  if (command && command.args.length) {
    const lastArg = command.args[command.args.length - 1];
    if (
      isOptionItem(lastArg) &&
      (lastArg.incomplete || !lastArg.args.length || handleEnrichWithClause(lastArg))
    ) {
      return { type: 'option' as const, command, node: lastArg };
    }
  }
  if (!command || (innerText.length <= offset && getLastCharFromTrimmed(innerText) === '|')) {
    //   // ... | <here>
    return { type: 'newCommand' as const, command: undefined, node: undefined };
  }

  // command a ... <here> OR command a = ... <here>
  return { type: 'expression' as const, command, node };
}

// The enrich with clause it a bit tricky to detect, so it deserves a specific check
function handleEnrichWithClause(option: ESQLCommandOption) {
  const fnArg = isFunctionItem(option.args[0]) ? option.args[0] : undefined;
  if (fnArg) {
    if (fnArg.name === '=' && isColumnItem(fnArg.args[0]) && fnArg.args[1]) {
      const assignValue = fnArg.args[1];
      if (Array.isArray(assignValue) && isColumnItem(assignValue[0])) {
        return fnArg.args[0].name === assignValue[0].name;
      }
    }
  }
  return false;
}

function getFinalSuggestions({ comma }: { comma?: boolean } = { comma: true }) {
  const finalSuggestions = [pipeCompleteItem];
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
  return {
    value: { signatures: [], activeParameter: 0, activeSignature: 0 },
    dispose: () => {},
  };
}

function isSourceCommand({ label }: AutocompleteCommandDefinition) {
  return ['from', 'row', 'show'].includes(String(label));
}

export async function suggest(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.CompletionContext,
  astProvider: (text: string | undefined) => { ast: ESQLAst },
  resourceRetriever?: ESQLCallbacks
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

  const astContext = getContext(innerText, ast, offset);
  const { getFieldsByType, getFieldsMap } = getFieldsByTypeRetriever(resourceRetriever);
  const getSources = getSourcesRetriever(resourceRetriever);
  const { getPolicies, getPolicyMetadata } = getPolicyRetriever(resourceRetriever);

  // console.log({ finalText, innerText, astContext, ast, offset });
  if (astContext.type === 'newCommand') {
    // propose main commands here
    // filter source commands if already defined
    const suggestions = commandAutocompleteDefinitions;
    if (!ast.length) {
      return suggestions.filter(isSourceCommand);
    }
    return suggestions.filter((def) => !isSourceCommand(def));
  }

  if (astContext.type === 'expression') {
    // suggest next possible argument, or option
    // otherwise a variable
    return getExpressionSuggestionsByType(
      innerText,
      ast,
      astContext,
      getSources,
      getFieldsByType,
      getFieldsMap,
      getPolicies
    );
  }
  if (astContext.type === 'option') {
    return getOptionArgsSuggestions(
      innerText,
      ast,
      astContext.node,
      astContext.command,
      getFieldsByType,
      getFieldsMap,
      getPolicyMetadata
    );
  }
  if (astContext.type === 'function') {
    // behave like list
    return getFunctionArgsSuggestions(
      innerText,
      astContext.node,
      astContext.command,
      getFieldsByType
    );
  }

  // console.log({ ast, triggerContext });
  // throw Error(`Where am I?`);
  return [];
}

function getFieldsByTypeRetriever(resourceRetriever?: ESQLCallbacks) {
  const cacheFields = new Map<string, ESQLRealField>();
  const getFields = async () => {
    if (!cacheFields.size) {
      const fieldsOfType = await resourceRetriever?.getFieldsFor?.();
      for (const field of fieldsOfType || []) {
        cacheFields.set(field.name, field);
      }
    }
  };
  return {
    getFieldsByType: async (expectedType: string | string[] = 'any') => {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      await getFields();
      return buildFieldsDefinitions(
        Array.from(cacheFields.values())
          ?.filter(({ type }) => {
            const ts = Array.isArray(type) ? type : [type];
            return ts.some((t) => types[0] === 'any' || types.includes(t));
          })
          .map(({ name }) => name) || []
      );
    },
    getFieldsMap: async () => {
      await getFields();
      const cacheCopy = new Map<string, ESQLRealField>();
      cacheFields.forEach((value, key) => cacheCopy.set(key, value));
      return cacheCopy;
    },
  };
}

function getPolicyRetriever(resourceRetriever?: ESQLCallbacks) {
  const getPolicies = async () => {
    return (await resourceRetriever?.getPolicies?.()) || [];
  };
  return {
    getPolicies: async () => {
      const policies = await getPolicies();
      return buildPoliciesDefinitions(policies);
    },
    getPolicyMetadata: async (policyName: string) => {
      const policies = await getPolicies();
      return policies.find(({ name }) => name === policyName);
    },
  };
}

function getSourcesRetriever(resourceRetriever?: ESQLCallbacks) {
  return async () => {
    return buildSourcesDefinitions((await resourceRetriever?.getSources?.()) || []);
  };
}

const TRIGGER_SUGGESTION_COMMAND = {
  title: 'Trigger Suggestion Dialog',
  id: 'editor.action.triggerSuggest',
};

function findNewVariable(variables: Map<string, ESQLVariable[]>) {
  let autoGeneratedVariableCounter = 0;
  let name = `var${autoGeneratedVariableCounter++}`;
  while (variables.has(name)) {
    name = `var${autoGeneratedVariableCounter++}`;
  }
  return name;
}

async function getExpressionSuggestionsByType(
  innerText: string,
  commands: ESQLCommand[],
  {
    command,
    node,
  }: {
    command: ESQLCommand;
    node: ESQLSingleAstItem | undefined;
  },
  getSources: GetSourceFn,
  getFieldsByType: GetFieldsByTypeFn,
  getFieldsMap: GetFieldsMapFn,
  getPolicies: GetPoliciesFn
) {
  const commandDef = getCommandDefinition(command.name);
  // get the argument position
  let argIndex = command.args.length;
  const lastArg = command.args[Math.max(argIndex - 1, 0)];
  if (isIncompleteItem(lastArg)) {
    argIndex = Math.max(argIndex - 1, 0);
  }
  const isNewExpression = getLastCharFromTrimmed(innerText) === ',' || argIndex === 0;
  const optionsAlreadyDeclared = (
    command.args.filter((arg) => isOptionItem(arg)) as ESQLCommandOption[]
  ).map(({ name }) => name);
  const optionsAvailable = commandDef.options.filter(
    ({ name }) => !optionsAlreadyDeclared.includes(name)
  );
  let argDef = commandDef.signature.params[argIndex];
  if (!argDef && isNewExpression && commandDef.signature.multipleParams) {
    argDef = commandDef.signature.params[0];
  }
  const lastValidArgDef = commandDef.signature.params[commandDef.signature.params.length - 1];

  // console.log({
  //   args: command.args,
  //   argsLength: command.args.length,
  //   commandDef,
  //   argIndex,
  //   lastArg,
  //   argDef,
  //   isNewExpression,
  // });
  const suggestions: AutocompleteCommandDefinition[] = [];
  const fieldsMap: Map<string, ESQLRealField> = await (argDef &&
  !isIncompleteItem(lastArg) &&
  isColumnItem(lastArg)
    ? getFieldsMap()
    : new Map());
  const anyVariables = collectVariables(commands, fieldsMap);
  const canHaveAssignments = ['eval', 'stats', 'where', 'row'].includes(command.name);

  if (canHaveAssignments && isNewExpression) {
    suggestions.push(buildNewVarDefinition(findNewVariable(anyVariables)));
  }
  if (canHaveAssignments && !isNewExpression && lastArg && !isIncompleteItem(lastArg)) {
    if (!argDef || lastValidArgDef.type !== 'function') {
      if (isColumnItem(lastArg) || isLiteralItem(lastArg)) {
        let argType = 'number';
        if (isLiteralItem(lastArg)) {
          argType = lastArg.literalType;
        }
        if (isColumnItem(lastArg)) {
          const hit = getColumnHit(lastArg.name, { fields: fieldsMap, variables: anyVariables });
          if (hit) {
            argType = hit.type;
          }
        }
        suggestions.push(...getBuiltinCompatibleFunctionDefinition(command.name, argType));
      }
    }
    if (canHaveAssignments && lastValidArgDef?.type === 'function' && isColumnItem(lastArg)) {
      suggestions.push(getAssignmentDefinitionCompletitionItem());
    }
  } else if (argDef) {
    if (argDef.type === 'column' || argDef.type === 'any') {
      suggestions.push(
        ...(await getAllSuggestionsByType(
          [argDef.innerType || 'any'],
          command.name,
          getFieldsByType,
          {
            functions: canHaveAssignments,
            fields: true,
            newVariables: false,
          }
        ))
      );
    }
    if (argDef.values) {
      suggestions.push(...buildConstantsDefinitions(argDef.values));
    }
    // @TODO: better handle the where command here
    if (argDef.type === 'boolean' && command.name === 'where') {
      suggestions.push(
        ...(await getAllSuggestionsByType(['any'], command.name, getFieldsByType, {
          functions: true,
          fields: true,
          newVariables: false,
        }))
      );
    }
    if (argDef.type === 'source') {
      if (argDef.innerType === 'policy') {
        const policies = await getPolicies();
        suggestions.push(...(policies.length ? policies : [buildNoPoliciesAvailableDefinition()]));
      } else {
        // @TODO: filter down the suggestions here based on other existing sources defined
        suggestions.push(...(await getSources()));
      }
    }
    if (['string', 'number', 'boolean'].includes(argDef.type) && !argDef.values) {
      suggestions.push(...getCompatibleLiterals(command.name, [argDef.type], [argDef.name]));
    }
  }

  const nonOptionArgs = command.args.filter(
    (arg) => !isOptionItem(arg) && !Array.isArray(arg) && !arg.incomplete
  );
  const mandatoryArgsAlreadyPresent =
    (commandDef.signature.multipleParams && nonOptionArgs.length > 1) ||
    nonOptionArgs.length >=
      commandDef.signature.params.filter(({ optional }) => !optional).length ||
    (!argDef && lastValidArgDef?.type === 'function');

  if (!isNewExpression && mandatoryArgsAlreadyPresent) {
    if (optionsAvailable.length) {
      suggestions.push(
        ...optionsAvailable.map((option) => {
          const completeItem: AutocompleteCommandDefinition = {
            label: option.name,
            insertText: option.name,
            kind: 21,
            detail: option.description,
            sortText: 'D',
          };
          if (option.wrapped) {
            completeItem.insertText = `${option.wrapped[0]}${option.name} $0 ${option.wrapped[1]}`;
            completeItem.insertTextRules =
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
          }
          return completeItem;
        })
      );
    }
    suggestions.push(
      ...getFinalSuggestions({
        comma:
          commandDef.signature.multipleParams &&
          optionsAvailable.length === commandDef.options.length,
      })
    );
  }
  return suggestions;
}

async function getAllSuggestionsByType(
  types: string[],
  commandName: string,
  getFieldsByType: GetFieldsByTypeFn,
  {
    functions,
    fields,
    newVariables,
  }: { functions: boolean; newVariables: boolean; fields: boolean }
): Promise<AutocompleteCommandDefinition[]> {
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
  innerText: string,
  fn: ESQLFunction,
  command: ESQLCommand,
  getFieldsByType: GetFieldsByTypeFn
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

async function getOptionArgsSuggestions(
  innerText: string,
  commands: ESQLCommand[],
  option: ESQLCommandOption,
  command: ESQLCommand,
  getFieldsByType: GetFieldsByTypeFn,
  getFieldsMaps: GetFieldsMapFn,
  getPolicyMetadata: GetPolicyMetadataFn
) {
  const optionDef = getCommandOption(option.name);
  const suggestions = [];
  if (command.name === 'enrich') {
    if (option.name === 'on') {
      const policyName = isSourceItem(command.args[0]) ? command.args[0].name : undefined;
      if (policyName) {
        const [policyMetadata, fieldsMap] = await Promise.all([
          getPolicyMetadata(policyName),
          getFieldsMaps(),
        ]);
        if (policyMetadata) {
          suggestions.push(
            ...buildMatchingFieldsDefinition(
              policyMetadata.matchField,
              Array.from(fieldsMap.keys())
            )
          );
        }
      }
    }
    if (option.name === 'with') {
      let argIndex = option.args.length;
      const lastArg = option.args[Math.max(argIndex - 1, 0)];
      if (isIncompleteItem(lastArg)) {
        argIndex = Math.max(argIndex - 1, 0);
      }
      const policyName = isSourceItem(command.args[0]) ? command.args[0].name : undefined;
      if (policyName) {
        const [policyMetadata, fieldsMap] = await Promise.all([
          getPolicyMetadata(policyName),
          getFieldsMaps(),
        ]);
        const isNewExpression = getLastCharFromTrimmed(innerText) === ',' || argIndex === 0;
        const anyVariables = collectVariables(commands, fieldsMap);

        if (isNewExpression) {
          suggestions.push(buildNewVarDefinition(findNewVariable(anyVariables)));
          if (policyMetadata) {
            suggestions.push(...buildFieldsDefinitions(policyMetadata.enrichFields));
          }
        }
        if (!isNewExpression && lastArg && !isIncompleteItem(lastArg)) {
          suggestions.push(...getBuiltinCompatibleFunctionDefinition(command.name, 'any'));
        }
      }
    }
  }
  if (optionDef && !suggestions.length) {
    const argIndex = Math.max(option.args.length - 1, 0);
    const types = [optionDef.signature.params[argIndex].type].filter(nonNullable);
    suggestions.push(
      ...(await getAllSuggestionsByType(types, command.name, getFieldsByType, {
        functions: false,
        fields: true,
        newVariables: false,
      }))
    );
  }
  return suggestions;
}

// async function getIdentifierSuggestions(
//   innerText: string,
//   command: ESQLCommand,
//   getSources: GetSourceFn,
//   getFieldsByType: GetFieldsByTypeFn
// ): Promise<AutocompleteCommandDefinition[]> {
//   // does the command has arguments?
//   const commandDef = getCommandDefinition(command.name);
//   if (
//     commandDef.signature.params.filter(({ optional }) => !optional).length <= command.args.length &&
//     !command.incomplete
//   ) {
//     if (getLastCharFromTrimmed(innerText) !== ',') {
//       return getFinalSuggestions({ comma: true }).concat(getOptions(command));
//     }
//   }
//   if (command.name === 'from') {
//     // find out possible arguments for the command
//     return getSources();
//   }
//   return getFieldsByType('any');
// }
