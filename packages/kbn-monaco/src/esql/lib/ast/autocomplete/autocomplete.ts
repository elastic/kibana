/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uniqBy from 'lodash/uniqBy';
import type { monaco } from '../../../../monaco_imports';
import type { AutocompleteCommandDefinition } from './types';
import { nonNullable } from '../ast_helpers';
import {
  columnExists,
  getColumnHit,
  getCommandDefinition,
  getCommandMode,
  getCommandOption,
  getFunctionDefinition,
  getLastCharFromTrimmed,
  isAssignment,
  isAssignmentComplete,
  isColumnItem,
  isFunctionItem,
  isIncompleteItem,
  isLiteralItem,
  isOptionItem,
  isRestartingExpression,
  isSettingItem,
  isSourceItem,
  isTimeIntervalItem,
  monacoPositionToOffset,
} from '../shared/helpers';
import { collectVariables, excludeVariablesFromCurrentCommand } from '../shared/variables';
import type {
  AstProviderFn,
  ESQLAst,
  ESQLAstItem,
  ESQLCommand,
  ESQLCommandMode,
  ESQLCommandOption,
  ESQLFunction,
  ESQLSingleAstItem,
} from '../types';
import type { ESQLPolicy, ESQLRealField, ESQLVariable, ReferenceMaps } from '../validation/types';
import {
  commaCompleteItem,
  commandAutocompleteDefinitions,
  getAssignmentDefinitionCompletitionItem,
  getBuiltinCompatibleFunctionDefinition,
  pipeCompleteItem,
} from './complete_items';
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
  buildVariablesDefinitions,
  buildOptionDefinition,
  TRIGGER_SUGGESTION_COMMAND,
  buildSettingDefinitions,
  buildSettingValueDefinitions,
} from './factories';
import { EDITOR_MARKER } from '../shared/constants';
import { getAstContext, removeMarkerArgFromArgsList } from '../shared/context';
import {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from '../shared/resources_helpers';
import { ESQLCallbacks } from '../shared/types';

type GetSourceFn = () => Promise<AutocompleteCommandDefinition[]>;
type GetFieldsByTypeFn = (
  type: string | string[],
  ignored?: string[]
) => Promise<AutocompleteCommandDefinition[]>;
type GetFieldsMapFn = () => Promise<Map<string, ESQLRealField>>;
type GetPoliciesFn = () => Promise<AutocompleteCommandDefinition[]>;
type GetPolicyMetadataFn = (name: string) => Promise<ESQLPolicy | undefined>;

function hasSameArgBothSides(assignFn: ESQLFunction) {
  if (assignFn.name === '=' && isColumnItem(assignFn.args[0]) && assignFn.args[1]) {
    const assignValue = assignFn.args[1];
    if (Array.isArray(assignValue) && isColumnItem(assignValue[0])) {
      return assignFn.args[0].name === assignValue[0].name;
    }
  }
}

function appendEnrichFields(
  fieldsMap: Map<string, ESQLRealField>,
  policyMetadata: ESQLPolicy | undefined
) {
  if (!policyMetadata) {
    return fieldsMap;
  }
  // @TODO: improve this
  const newMap: Map<string, ESQLRealField> = new Map(fieldsMap);
  for (const field of policyMetadata.enrichFields) {
    newMap.set(field, { name: field, type: 'number' });
  }
  return newMap;
}

function getFinalSuggestions({ comma }: { comma?: boolean } = { comma: true }) {
  const finalSuggestions = [pipeCompleteItem];
  if (comma) {
    finalSuggestions.push(commaCompleteItem);
  }
  return finalSuggestions;
}

function isMathFunction(char: string) {
  return ['+', '-', '*', '/', '%', '='].some((op) => char === op);
}

function isComma(char: string) {
  return char === ',';
}

function isSourceCommand({ label }: AutocompleteCommandDefinition) {
  return ['from', 'row', 'show'].includes(String(label));
}
/**
 * This function count the number of unclosed brackets in order to
 * locally fix the queryString to generate a valid AST
 * A known limitation of this is that is not aware of commas "," or pipes "|"
 * so it is not yet helpful on a multiple commands errors (a workaround it to pass each command here...)
 * @param bracketType
 * @param text
 * @returns
 */
function countBracketsUnclosed(bracketType: '(' | '[', text: string) {
  const stack = [];
  const closingBrackets = { '(': ')', '[': ']' };
  for (const char of text) {
    if (char === bracketType) {
      stack.push(bracketType);
    } else if (char === closingBrackets[bracketType]) {
      stack.pop();
    }
  }
  return stack.length;
}

export async function suggest(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.CompletionContext,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
): Promise<AutocompleteCommandDefinition[]> {
  // take the full text but then slice it to the current position
  const fullText = model.getValue();
  const offset = monacoPositionToOffset(fullText, position);
  const innerText = fullText.substring(0, offset);

  let finalText = innerText;

  // check if all brackets are closed, otherwise close them
  const unclosedRoundBrackets = countBracketsUnclosed('(', finalText);
  const unclosedSquaredBrackets = countBracketsUnclosed('[', finalText);
  const unclosedBrackets = unclosedRoundBrackets + unclosedSquaredBrackets;
  // if it's a comma by the user or a forced trigger by a function argument suggestion
  // add a marker to make the expression still valid
  if (
    context.triggerCharacter === ',' ||
    (context.triggerKind === 0 && unclosedRoundBrackets === 0) ||
    (context.triggerCharacter === ' ' &&
      // make this more robust
      (isMathFunction(innerText[offset - 2]) || isComma(innerText[offset - 2])))
  ) {
    finalText = `${innerText.substring(0, offset)}${EDITOR_MARKER}${innerText.substring(offset)}`;
  }
  // if there are unclosed brackets, close them
  if (unclosedBrackets) {
    for (const [char, count] of [
      [')', unclosedRoundBrackets],
      [']', unclosedSquaredBrackets],
    ]) {
      if (count) {
        // inject the closing brackets
        finalText += Array(count).fill(char).join('');
      }
    }
  }

  const { ast } = await astProvider(finalText);

  const astContext = getAstContext(innerText, ast, offset);
  // build the correct query to fetch the list of fields
  const queryForFields = buildQueryForFields(ast, finalText);
  const { getFieldsByType, getFieldsMap } = getFieldsByTypeRetriever(
    queryForFields,
    resourceRetriever
  );
  const getSources = getSourcesRetriever(resourceRetriever);
  const { getPolicies, getPolicyMetadata } = getPolicyRetriever(resourceRetriever);

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
      getPolicies,
      getPolicyMetadata
    );
  }
  if (astContext.type === 'setting') {
    // need this wrap/unwrap thing to make TS happy
    const { setting, ...rest } = astContext;
    if (setting && isSettingItem(setting)) {
      return getSettingArgsSuggestions(
        innerText,
        ast,
        { setting, ...rest },
        getFieldsByType,
        getFieldsMap,
        getPolicyMetadata
      );
    }
  }
  if (astContext.type === 'option') {
    // need this wrap/unwrap thing to make TS happy
    const { option, ...rest } = astContext;
    if (option && isOptionItem(option)) {
      return getOptionArgsSuggestions(
        innerText,
        ast,
        { option, ...rest },
        getFieldsByType,
        getFieldsMap,
        getPolicyMetadata
      );
    }
  }
  if (astContext.type === 'function') {
    return getFunctionArgsSuggestions(
      innerText,
      ast,
      astContext,
      getFieldsByType,
      getFieldsMap,
      getPolicyMetadata
    );
  }
  return [];
}

export function buildQueryForFields(ast: ESQLAst, queryString: string) {
  const prevCommand = ast[Math.max(ast.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

function getFieldsByTypeRetriever(queryString: string, resourceRetriever?: ESQLCallbacks) {
  const helpers = getFieldsByTypeHelper(queryString, resourceRetriever);
  return {
    getFieldsByType: async (expectedType: string | string[] = 'any', ignored: string[] = []) => {
      const fields = await helpers.getFieldsByType(expectedType, ignored);
      return buildFieldsDefinitions(fields);
    },
    getFieldsMap: helpers.getFieldsMap,
  };
}

function getPolicyRetriever(resourceRetriever?: ESQLCallbacks) {
  const helpers = getPolicyHelper(resourceRetriever);
  return {
    getPolicies: async () => {
      const policies = await helpers.getPolicies();
      return buildPoliciesDefinitions(policies);
    },
    getPolicyMetadata: helpers.getPolicyMetadata,
  };
}

function getSourcesRetriever(resourceRetriever?: ESQLCallbacks) {
  const helper = getSourcesHelper(resourceRetriever);
  return async () => {
    const list = (await helper()) || [];
    // hide indexes that start with .
    return buildSourcesDefinitions(list.filter(({ hidden }) => !hidden).map(({ name }) => name));
  };
}

function findNewVariable(variables: Map<string, ESQLVariable[]>) {
  let autoGeneratedVariableCounter = 0;
  let name = `var${autoGeneratedVariableCounter++}`;
  while (variables.has(name)) {
    name = `var${autoGeneratedVariableCounter++}`;
  }
  return name;
}

function areCurrentArgsValid(
  command: ESQLCommand,
  node: ESQLAstItem,
  references: Pick<ReferenceMaps, 'fields' | 'variables'>
) {
  // unfortunately here we need to bake some command-specific logic
  if (command.name === 'stats') {
    if (node) {
      // consider the following expressions not complete yet
      // ... | stats a
      // ... | stats a =
      if (isColumnItem(node) || (isAssignment(node) && !isAssignmentComplete(node))) {
        return false;
      }
    }
  }
  if (command.name === 'eval') {
    if (node) {
      if (isFunctionItem(node)) {
        if (isAssignment(node)) {
          return isAssignmentComplete(node);
        } else {
          return isFunctionArgComplete(node, references).complete;
        }
      }
    }
  }
  if (command.name === 'where') {
    if (node) {
      if (
        isColumnItem(node) ||
        (isFunctionItem(node) && !isFunctionArgComplete(node, references).complete)
      ) {
        return false;
      } else {
        return (
          extractFinalTypeFromArg(node, references) ===
          getCommandDefinition(command.name).signature.params[0].type
        );
      }
    }
  }
  if (command.name === 'rename') {
    if (node) {
      if (isColumnItem(node)) {
        return true;
      }
    }
  }
  return true;
}

function extractFinalTypeFromArg(
  arg: ESQLAstItem,
  references: Pick<ReferenceMaps, 'fields' | 'variables'>
): string | undefined {
  if (Array.isArray(arg)) {
    return extractFinalTypeFromArg(arg[0], references);
  }
  if (isColumnItem(arg) || isLiteralItem(arg)) {
    if (isLiteralItem(arg)) {
      return arg.literalType;
    }
    if (isColumnItem(arg)) {
      const hit = getColumnHit(arg.name, references);
      if (hit) {
        return hit.type;
      }
    }
  }
  if (isTimeIntervalItem(arg)) {
    return arg.type;
  }
  if (isFunctionItem(arg)) {
    const fnDef = getFunctionDefinition(arg.name);
    if (fnDef) {
      // @TODO: improve this to better filter down the correct return type based on existing arguments
      // just mind that this can be highly recursive...
      return fnDef.signatures[0].returnType;
    }
  }
}

// @TODO: refactor this to be shared with validation
function isFunctionArgComplete(
  arg: ESQLFunction,
  references: Pick<ReferenceMaps, 'fields' | 'variables'>
) {
  const fnDefinition = getFunctionDefinition(arg.name);
  if (!fnDefinition) {
    return { complete: false };
  }
  const cleanedArgs = removeMarkerArgFromArgsList(arg)!.args;
  const argLengthCheck = fnDefinition.signatures.some((def) => {
    if (def.infiniteParams && cleanedArgs.length > 0) {
      return true;
    }
    if (def.minParams && cleanedArgs.length >= def.minParams) {
      return true;
    }
    if (cleanedArgs.length === def.params.length) {
      return true;
    }
    return cleanedArgs.length >= def.params.filter(({ optional }) => !optional).length;
  });
  if (!argLengthCheck) {
    return { complete: false, reason: 'fewArgs' };
  }
  const hasCorrectTypes = fnDefinition.signatures.some((def) => {
    return arg.args.every((a, index) => {
      if (def.infiniteParams) {
        return true;
      }
      return def.params[index].type === extractFinalTypeFromArg(a, references);
    });
  });
  if (!hasCorrectTypes) {
    return { complete: false, reason: 'wrongTypes' };
  }
  return { complete: true };
}

function extractArgMeta(
  commandOrOption: ESQLCommand | ESQLCommandOption,
  node: ESQLSingleAstItem | undefined
) {
  let argIndex = commandOrOption.args.length;
  const prevIndex = Math.max(argIndex - 1, 0);
  const lastArg = removeMarkerArgFromArgsList(commandOrOption)!.args[prevIndex];
  if (isIncompleteItem(lastArg)) {
    argIndex = prevIndex;
  }

  // if a node is not specified use the lastArg
  // mind to give priority to node as lastArg might be a function root
  // => "a > b and c == d" gets translated into and( gt(a, b) , eq(c, d) ) => hence "and" is lastArg
  const nodeArg = node || lastArg;

  return { argIndex, prevIndex, lastArg, nodeArg };
}

async function getExpressionSuggestionsByType(
  innerText: string,
  commands: ESQLCommand[],
  {
    command,
    option,
    node,
  }: {
    command: ESQLCommand;
    option: ESQLCommandOption | undefined;
    node: ESQLSingleAstItem | undefined;
  },
  getSources: GetSourceFn,
  getFieldsByType: GetFieldsByTypeFn,
  getFieldsMap: GetFieldsMapFn,
  getPolicies: GetPoliciesFn,
  getPolicyMetadata: GetPolicyMetadataFn
) {
  const commandDef = getCommandDefinition(command.name);
  const { argIndex, prevIndex, lastArg, nodeArg } = extractArgMeta(command, node);

  // A new expression is considered either
  // * just after a command name => i.e. ... | STATS <here>
  // * or after a comma => i.e. STATS fieldA, <here>
  const isNewExpression = isRestartingExpression(innerText) || argIndex === 0;

  // early exit in case of a missing function
  if (isFunctionItem(lastArg) && !getFunctionDefinition(lastArg.name)) {
    return [];
  }

  // Are options already declared? This is useful to suggest only new ones
  const optionsAlreadyDeclared = (
    command.args.filter((arg) => isOptionItem(arg)) as ESQLCommandOption[]
  ).map(({ name }) => ({
    name,
    index: commandDef.options.findIndex(({ name: defName }) => defName === name),
  }));
  const optionsAvailable = commandDef.options.filter(({ name }, index) => {
    const optArg = optionsAlreadyDeclared.find(({ name: optionName }) => optionName === name);
    return (!optArg && !optionsAlreadyDeclared.length) || (optArg && index > optArg.index);
  });
  // get the next definition for the given command
  let argDef = commandDef.signature.params[argIndex];
  // tune it for the variadic case
  if (!argDef) {
    // this is the case of a comma argument
    if (commandDef.signature.multipleParams) {
      if (isNewExpression || (isAssignment(lastArg) && !isAssignmentComplete(lastArg))) {
        // i.e. ... | <COMMAND> a, <here>
        // i.e. ... | <COMMAND> a = ..., b = <here>
        argDef = commandDef.signature.params[0];
      }
    }

    // this is the case where there's an argument, but it's of the wrong type
    // i.e. ... | WHERE numberField <here> (WHERE wants a boolean expression!)
    // i.e. ... | STATS numberfield <here> (STATS wants a function expression!)
    if (!isNewExpression && nodeArg && !Array.isArray(nodeArg)) {
      const prevArg = commandDef.signature.params[prevIndex];
      // in some cases we do not want to go back as the command only accepts a literal
      // i.e. LIMIT 5 <suggest> -> that's it, so no argDef should be assigned

      // make an exception for STATS (STATS is the only command who accept a function type as arg)
      if (
        prevArg &&
        (prevArg.type === 'function' || (!Array.isArray(nodeArg) && prevArg.type !== nodeArg.type))
      ) {
        if (!isLiteralItem(nodeArg) || !prevArg.literalOnly) {
          argDef = prevArg;
        }
      }
    }
  }

  // collect all fields + variables to suggest
  const fieldsMap: Map<string, ESQLRealField> = await (argDef ? getFieldsMap() : new Map());
  const anyVariables = collectVariables(commands, fieldsMap);

  // enrich with assignment has some special rules who are handled somewhere else
  const canHaveAssignments = ['eval', 'stats', 'row'].includes(command.name);

  const references = { fields: fieldsMap, variables: anyVariables };

  const suggestions: AutocompleteCommandDefinition[] = [];

  // in this flow there's a clear plan here from argument definitions so try to follow it
  if (argDef) {
    if (argDef.type === 'column' || argDef.type === 'any' || argDef.type === 'function') {
      if (isNewExpression && canHaveAssignments) {
        // i.e.
        // ... | ROW <suggest>
        // ... | STATS <suggest>
        // ... | STATS ..., <suggest>
        // ... | EVAL <suggest>
        // ... | EVAL ..., <suggest>
        suggestions.push(buildNewVarDefinition(findNewVariable(anyVariables)));
      }
    }
    // Suggest fields or variables
    if (argDef.type === 'column' || argDef.type === 'any') {
      // ... | <COMMAND> <suggest>
      if (!nodeArg || (isNewExpression && commandDef.signature.multipleParams)) {
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(
            [argDef.innerType || 'any'],
            command.name,
            option?.name,
            getFieldsByType,
            {
              functions: canHaveAssignments,
              fields: true,
              variables: anyVariables,
            },
            {
              ignoreFields: isNewExpression
                ? command.args.filter(isColumnItem).map(({ name }) => name)
                : [],
            }
          ))
        );
      }
    }
    if (argDef.type === 'function' || argDef.type === 'any') {
      if (isColumnItem(nodeArg)) {
        // ... | STATS a <suggest>
        // ... | EVAL a <suggest>
        const nodeArgType = extractFinalTypeFromArg(nodeArg, references);
        if (nodeArgType) {
          suggestions.push(
            ...getBuiltinCompatibleFunctionDefinition(command.name, undefined, nodeArgType)
          );
        } else {
          suggestions.push(getAssignmentDefinitionCompletitionItem());
        }
      }
      if (isNewExpression || (isAssignment(nodeArg) && !isAssignmentComplete(nodeArg))) {
        // ... | STATS a = <suggest>
        // ... | EVAL a = <suggest>
        // ... | STATS a = ..., <suggest>
        // ... | EVAL a = ..., <suggest>
        // ... | STATS a = ..., b = <suggest>
        // ... | EVAL a = ..., b = <suggest>
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(
            ['any'],
            command.name,
            option?.name,
            getFieldsByType,
            {
              functions: true,
              fields: false,
              variables: nodeArg ? undefined : anyVariables,
            }
          ))
        );
        if (command.name === 'show') {
          suggestions.push(
            ...getBuiltinCompatibleFunctionDefinition(command.name, undefined, 'any')
          );
        }
      }
    }

    if (argDef.type === 'any') {
      // ... | EVAL var = field <suggest>
      // ... | EVAL var = fn(field) <suggest>
      // make sure we're still in the same assignment context and there's no comma (newExpression ensures that)
      if (!isNewExpression) {
        if (isAssignment(nodeArg) && isAssignmentComplete(nodeArg)) {
          const [rightArg] = nodeArg.args[1] as [ESQLSingleAstItem];
          const nodeArgType = extractFinalTypeFromArg(rightArg, references);
          suggestions.push(
            ...getBuiltinCompatibleFunctionDefinition(command.name, undefined, nodeArgType || 'any')
          );
          if (nodeArgType === 'number' && isLiteralItem(rightArg)) {
            // ... EVAL var = 1 <suggest>
            suggestions.push(...getCompatibleLiterals(command.name, ['time_literal_unit']));
          }
          if (isFunctionItem(rightArg)) {
            if (rightArg.args.some(isTimeIntervalItem)) {
              const lastFnArg = rightArg.args[rightArg.args.length - 1];
              const lastFnArgType = extractFinalTypeFromArg(lastFnArg, references);
              if (lastFnArgType === 'number' && isLiteralItem(lastFnArg))
                // ... EVAL var = 1 year + 2 <suggest>
                suggestions.push(...getCompatibleLiterals(command.name, ['time_literal_unit']));
            }
          }
        } else {
          if (isFunctionItem(nodeArg)) {
            const nodeArgType = extractFinalTypeFromArg(nodeArg, references);
            suggestions.push(
              ...(await getBuiltinFunctionNextArgument(
                command,
                option,
                argDef,
                nodeArg,
                nodeArgType || 'any',
                references,
                getFieldsByType
              ))
            );
            if (nodeArg.args.some(isTimeIntervalItem)) {
              const lastFnArg = nodeArg.args[nodeArg.args.length - 1];
              const lastFnArgType = extractFinalTypeFromArg(lastFnArg, references);
              if (lastFnArgType === 'number' && isLiteralItem(lastFnArg))
                // ... EVAL var = 1 year + 2 <suggest>
                suggestions.push(...getCompatibleLiterals(command.name, ['time_literal_unit']));
            }
          }
        }
      }
    }

    // if the definition includes a list of constants, suggest them
    if (argDef.values) {
      // ... | <COMMAND> ... <suggest enums>
      suggestions.push(...buildConstantsDefinitions(argDef.values));
    }
    // If the type is specified try to dig deeper in the definition to suggest the best candidate
    if (['string', 'number', 'boolean'].includes(argDef.type) && !argDef.values) {
      // it can be just literal values (i.e. "string")
      if (argDef.literalOnly) {
        // ... | <COMMAND> ... <suggest>
        suggestions.push(...getCompatibleLiterals(command.name, [argDef.type], [argDef.name]));
      } else {
        // or it can be anything else as long as it is of the right type and the end (i.e. column or function)
        if (!nodeArg) {
          // ... | <COMMAND> <suggest>
          // In this case start suggesting something not strictly based on type
          suggestions.push(
            ...(await getFieldsOrFunctionsSuggestions(
              ['any'],
              command.name,
              option?.name,
              getFieldsByType,
              {
                functions: true,
                fields: true,
                variables: anyVariables,
              }
            ))
          );
        } else {
          // if something is already present, leverage its type to suggest something in context
          const nodeArgType = extractFinalTypeFromArg(nodeArg, references);
          // These cases can happen here, so need to identify each and provide the right suggestion
          // i.e. ... | <COMMAND> field <suggest>
          // i.e. ... | <COMMAND> field + <suggest>
          // i.e. ... | <COMMAND> field >= <suggest>
          // i.e. ... | <COMMAND> field > 0 <suggest>
          // i.e. ... | <COMMAND> field + otherN <suggest>

          if (nodeArgType) {
            if (isFunctionItem(nodeArg)) {
              suggestions.push(
                ...(await getBuiltinFunctionNextArgument(
                  command,
                  option,
                  argDef,
                  nodeArg,
                  nodeArgType,
                  references,
                  getFieldsByType
                ))
              );
            } else {
              // i.e. ... | <COMMAND> field <suggest>
              suggestions.push(
                ...getBuiltinCompatibleFunctionDefinition(command.name, undefined, nodeArgType)
              );
            }
          }
        }
      }
    }
    if (argDef.type === 'source') {
      if (argDef.innerType === 'policy') {
        // ... | ENRICH <suggest>
        const policies = await getPolicies();
        suggestions.push(...(policies.length ? policies : [buildNoPoliciesAvailableDefinition()]));
      } else {
        // FROM <suggest>
        // @TODO: filter down the suggestions here based on other existing sources defined
        suggestions.push(...(await getSources()));
      }
    }
  }

  const nonOptionArgs = command.args.filter(
    (arg) => !isOptionItem(arg) && !isSettingItem(arg) && !Array.isArray(arg) && !arg.incomplete
  );
  // Perform some checks on mandatory arguments
  const mandatoryArgsAlreadyPresent =
    (commandDef.signature.multipleParams && nonOptionArgs.length > 1) ||
    nonOptionArgs.length >=
      commandDef.signature.params.filter(({ optional }) => !optional).length ||
    argDef?.type === 'function';

  // check if declared args are fully valid for the given command
  const currentArgsAreValidForCommand = areCurrentArgsValid(command, nodeArg, references);

  // latest suggestions: options and final ones
  if (
    (!isNewExpression && mandatoryArgsAlreadyPresent && currentArgsAreValidForCommand) ||
    optionsAlreadyDeclared.length
  ) {
    // suggest some command options
    if (optionsAvailable.length) {
      suggestions.push(...optionsAvailable.map(buildOptionDefinition));
    }

    if (!optionsAvailable.length || optionsAvailable.every(({ optional }) => optional)) {
      // now suggest pipe or comma
      suggestions.push(
        ...getFinalSuggestions({
          comma:
            commandDef.signature.multipleParams &&
            optionsAvailable.length === commandDef.options.length,
        })
      );
    }
  }
  // Due to some logic overlapping functions can be repeated
  // so dedupe here based on insertText string (it can differ from name)
  return uniqBy(suggestions, (suggestion) => suggestion.insertText);
}

async function getBuiltinFunctionNextArgument(
  command: ESQLCommand,
  option: ESQLCommandOption | undefined,
  argDef: { type: string },
  nodeArg: ESQLFunction,
  nodeArgType: string,
  references: Pick<ReferenceMaps, 'fields' | 'variables'>,
  getFieldsByType: GetFieldsByTypeFn
) {
  const suggestions = [];
  const isFnComplete = isFunctionArgComplete(nodeArg, references);
  if (isFnComplete.complete) {
    // i.e. ... | <COMMAND> field > 0 <suggest>
    // i.e. ... | <COMMAND> field + otherN <suggest>
    suggestions.push(
      ...getBuiltinCompatibleFunctionDefinition(command.name, option?.name, nodeArgType || 'any')
    );
  } else {
    // i.e. ... | <COMMAND> field >= <suggest>
    // i.e. ... | <COMMAND> field + <suggest>
    // i.e. ... | <COMMAND> field and <suggest>

    // Because it's an incomplete function, need to extract the type of the current argument
    // and suggest the next argument based on types

    // pick the last arg and check its type to verify whether is incomplete for the given function
    const cleanedArgs = removeMarkerArgFromArgsList(nodeArg)!.args;
    const nestedType = extractFinalTypeFromArg(nodeArg.args[cleanedArgs.length - 1], references);

    if (isFnComplete.reason === 'fewArgs') {
      const finalType = nestedType || nodeArgType || 'any';
      suggestions.push(
        ...(await getFieldsOrFunctionsSuggestions(
          // this is a special case with AND/OR
          // <COMMAND> expression AND/OR <suggest>
          // technically another boolean value should be suggested, but it is a better experience
          // to actually suggest a wider set of fields/functions
          [
            finalType === 'boolean' && getFunctionDefinition(nodeArg.name)?.builtin
              ? 'any'
              : finalType,
          ],
          command.name,
          option?.name,
          getFieldsByType,
          {
            functions: true,
            fields: true,
            variables: references.variables,
          }
        ))
      );
    }
    if (isFnComplete.reason === 'wrongTypes') {
      if (nestedType) {
        // suggest something to complete the builtin function
        if (nestedType !== argDef.type) {
          suggestions.push(
            ...getBuiltinCompatibleFunctionDefinition(command.name, undefined, nestedType, [
              argDef.type,
            ])
          );
        }
      }
    }
  }
  return suggestions;
}

async function getFieldsOrFunctionsSuggestions(
  types: string[],
  commandName: string,
  optionName: string | undefined,
  getFieldsByType: GetFieldsByTypeFn,
  {
    functions,
    fields,
    variables,
  }: {
    functions: boolean;
    fields: boolean;
    variables?: Map<string, ESQLVariable[]>;
  },
  {
    ignoreFn = [],
    ignoreFields = [],
  }: {
    ignoreFn?: string[];
    ignoreFields?: string[];
  } = {}
): Promise<AutocompleteCommandDefinition[]> {
  const filteredFieldsByType = (await (fields
    ? getFieldsByType(types, ignoreFields)
    : [])) as AutocompleteCommandDefinition[];

  const filteredVariablesByType: string[] = [];
  if (variables) {
    for (const variable of variables.values()) {
      if (types.includes('any') || types.includes(variable[0].type)) {
        filteredVariablesByType.push(variable[0].name);
      }
    }
    // due to a bug on the ES|QL table side, filter out fields list with underscored variable names (??)
    // avg( numberField ) => avg_numberField_
    if (
      filteredVariablesByType.length &&
      filteredVariablesByType.some((v) => /[^a-zA-Z\d]/.test(v))
    ) {
      for (const variable of filteredVariablesByType) {
        const underscoredName = variable.replace(/[^a-zA-Z\d]/g, '_');
        const index = filteredFieldsByType.findIndex(({ label }) => underscoredName === label);
        if (index >= 0) {
          filteredFieldsByType.splice(index);
        }
      }
    }
  }

  const suggestions = filteredFieldsByType.concat(
    functions ? getCompatibleFunctionDefinition(commandName, optionName, types, ignoreFn) : [],
    variables ? buildVariablesDefinitions(filteredVariablesByType) : [],
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
  commands: ESQLCommand[],
  {
    command,
    option,
    node,
  }: {
    command: ESQLCommand;
    option: ESQLCommandOption | undefined;
    node: ESQLFunction;
  },
  getFieldsByType: GetFieldsByTypeFn,
  getFieldsMap: GetFieldsMapFn,
  getPolicyMetadata: GetPolicyMetadataFn
): Promise<AutocompleteCommandDefinition[]> {
  const fnDefinition = getFunctionDefinition(node.name);
  // early exit on no hit
  if (!fnDefinition) {
    return [];
  }
  const fieldsMap: Map<string, ESQLRealField> = await getFieldsMap();
  const variablesExcludingCurrentCommandOnes = excludeVariablesFromCurrentCommand(
    commands,
    command,
    fieldsMap
  );
  // pick the type of the next arg
  const shouldGetNextArgument = node.text.includes(EDITOR_MARKER);
  let argIndex = Math.max(node.args.length, 0);
  if (!shouldGetNextArgument && argIndex) {
    argIndex -= 1;
  }
  const types = fnDefinition.signatures.flatMap((signature) => {
    if (signature.params.length > argIndex) {
      return signature.params[argIndex].type;
    }
    if (signature.infiniteParams) {
      return signature.params[0].type;
    }
    return [];
  });

  const arg = node.args[argIndex];

  const hasMoreMandatoryArgs =
    fnDefinition.signatures[0].params.filter(({ optional }, index) => !optional && index > argIndex)
      .length > argIndex;

  const suggestions = [];
  const noArgDefined = !arg;
  const isUnknownColumn =
    arg &&
    isColumnItem(arg) &&
    !columnExists(arg, { fields: fieldsMap, variables: variablesExcludingCurrentCommandOnes }).hit;
  if (noArgDefined || isUnknownColumn) {
    // ... | EVAL fn( <suggest>)
    // ... | EVAL fn( field, <suggest>)
    suggestions.push(
      ...(await getFieldsOrFunctionsSuggestions(
        types,
        command.name,
        option?.name,
        getFieldsByType,
        {
          functions: command.name !== 'stats',
          fields: true,
          variables: variablesExcludingCurrentCommandOnes,
        },
        // do not repropose the same function as arg
        // i.e. avoid cases like abs(abs(abs(...))) with suggestions
        { ignoreFn: [node.name] }
      ))
    );
  }

  // for eval and row commands try also to complete numeric literals with time intervals where possible
  if (arg) {
    if (command.name !== 'stats') {
      if (isLiteralItem(arg) && arg.literalType === 'number') {
        // ... | EVAL fn(2 <suggest>)
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(
            ['time_literal_unit'],
            command.name,
            option?.name,
            getFieldsByType,
            {
              functions: false,
              fields: false,
              variables: variablesExcludingCurrentCommandOnes,
            }
          ))
        );
      }
    }
    if (hasMoreMandatoryArgs) {
      // suggest a comma if there's another argument for the function
      suggestions.push(commaCompleteItem);
    }
    // if there are other arguments in the function, inject automatically a comma after each suggestion
    return suggestions.map((suggestion) =>
      suggestion !== commaCompleteItem
        ? {
            ...suggestion,
            insertText:
              hasMoreMandatoryArgs && !fnDefinition.builtin
                ? `${suggestion.insertText},`
                : suggestion.insertText,
          }
        : suggestion
    );
  }

  return suggestions.map(({ insertText, ...rest }) => ({
    ...rest,
    insertText: hasMoreMandatoryArgs && !fnDefinition.builtin ? `${insertText},` : insertText,
  }));
}

async function getSettingArgsSuggestions(
  innerText: string,
  commands: ESQLCommand[],
  {
    command,
    node,
    setting,
  }: {
    command: ESQLCommand;
    setting: ESQLCommandMode;
    node: ESQLSingleAstItem | undefined;
  },
  getFieldsByType: GetFieldsByTypeFn,
  getFieldsMaps: GetFieldsMapFn,
  getPolicyMetadata: GetPolicyMetadataFn
) {
  const suggestions = [];
  const existingSettingArgs = new Set(
    command.args
      .filter((item) => isSettingItem(item) && !item.incomplete)
      .map((item) => (isSettingItem(item) ? item.name : undefined))
  );

  const settingDef =
    setting.name && setting.incomplete
      ? getCommandMode(setting.name)
      : getCommandDefinition(command.name).modes.find(({ name }) => !existingSettingArgs.has(name));

  if (settingDef) {
    const lastChar = getLastCharFromTrimmed(innerText);
    if (lastChar === '[') {
      // COMMAND [<here>
      suggestions.push(...buildSettingDefinitions(settingDef));
    } else if (lastChar === ':') {
      // COMMAND [setting: <here>
      suggestions.push(...buildSettingValueDefinitions(settingDef));
    }
  }
  return suggestions;
}

async function getOptionArgsSuggestions(
  innerText: string,
  commands: ESQLCommand[],
  {
    command,
    option,
    node,
  }: {
    command: ESQLCommand;
    option: ESQLCommandOption;
    node: ESQLSingleAstItem | undefined;
  },
  getFieldsByType: GetFieldsByTypeFn,
  getFieldsMaps: GetFieldsMapFn,
  getPolicyMetadata: GetPolicyMetadataFn
) {
  const optionDef = getCommandOption(option.name);
  const { nodeArg, argIndex, lastArg } = extractArgMeta(option, node);
  const suggestions = [];
  const isNewExpression = isRestartingExpression(innerText) || option.args.length === 0;

  const fieldsMap = await getFieldsMaps();
  const anyVariables = collectVariables(commands, fieldsMap);

  const references = {
    fields: fieldsMap,
    variables: anyVariables,
  };
  if (command.name === 'enrich') {
    if (option.name === 'on') {
      // if it's a new expression, suggest fields to match on
      if (isNewExpression || (option && isAssignment(option.args[0]) && !option.args[1])) {
        const policyName = isSourceItem(command.args[0]) ? command.args[0].name : undefined;
        if (policyName) {
          const policyMetadata = await getPolicyMetadata(policyName);
          if (policyMetadata) {
            suggestions.push(
              ...buildMatchingFieldsDefinition(
                policyMetadata.matchField,
                Array.from(fieldsMap.keys())
              )
            );
          }
        }
      } else {
        // propose the with option
        suggestions.push(
          buildOptionDefinition(getCommandOption('with')!),
          ...getFinalSuggestions({
            comma: true,
          })
        );
      }
    }
    if (option.name === 'with') {
      const policyName = isSourceItem(command.args[0]) ? command.args[0].name : undefined;
      if (policyName) {
        const policyMetadata = await getPolicyMetadata(policyName);
        const anyEnhancedVariables = collectVariables(
          commands,
          appendEnrichFields(fieldsMap, policyMetadata)
        );

        if (isNewExpression) {
          suggestions.push(buildNewVarDefinition(findNewVariable(anyEnhancedVariables)));
        }

        // make sure to remove the marker arg from the assign fn
        const assignFn = isAssignment(lastArg)
          ? (removeMarkerArgFromArgsList(lastArg) as ESQLFunction)
          : undefined;

        if (policyMetadata) {
          if (isNewExpression || (assignFn && !isAssignmentComplete(assignFn))) {
            // ... | ENRICH ... WITH a =
            suggestions.push(...buildFieldsDefinitions(policyMetadata.enrichFields));
          }
        }
        if (
          assignFn &&
          hasSameArgBothSides(assignFn) &&
          !isNewExpression &&
          !isIncompleteItem(assignFn)
        ) {
          // ... | ENRICH ... WITH a
          // effectively only assign will apper
          suggestions.push(
            ...getBuiltinCompatibleFunctionDefinition(command.name, undefined, 'any')
          );
        }

        if (
          assignFn &&
          (isAssignmentComplete(assignFn) || hasSameArgBothSides(assignFn)) &&
          !isNewExpression
        ) {
          suggestions.push(
            ...getFinalSuggestions({
              comma: true,
            })
          );
        }
      }
    }
  }
  if (command.name === 'rename') {
    if (option.args.length < 2) {
      suggestions.push(...buildVariablesDefinitions([findNewVariable(anyVariables)]));
    }
  }

  if (command.name === 'stats') {
    suggestions.push(
      ...(await getFieldsOrFunctionsSuggestions(
        ['column'],
        command.name,
        option.name,
        getFieldsByType,
        {
          functions: false,
          fields: true,
        }
      ))
    );

    const argDef = optionDef?.signature.params[argIndex];

    const nodeArgType = extractFinalTypeFromArg(nodeArg, references);
    // These cases can happen here, so need to identify each and provide the right suggestion
    // i.e. ... | STATS ... BY field + <suggest>
    // i.e. ... | STATS ... BY field >= <suggest>

    if (nodeArgType) {
      if (isFunctionItem(nodeArg) && !isFunctionArgComplete(nodeArg, references).complete) {
        suggestions.push(
          ...(await getBuiltinFunctionNextArgument(
            command,
            option,
            { type: argDef?.type || 'any' },
            nodeArg,
            nodeArgType,
            references,
            getFieldsByType
          ))
        );
      }
    }
  }

  if (optionDef) {
    if (!suggestions.length) {
      const argDefIndex = optionDef.signature.multipleParams
        ? 0
        : Math.max(option.args.length - 1, 0);
      const types = [optionDef.signature.params[argDefIndex].type].filter(nonNullable);
      // If it's a complete expression then proposed some final suggestions
      // A complete expression is either a function or a column: <COMMAND> <OPTION> field <here>
      // Or an assignment complete: <COMMAND> <OPTION> field = ... <here>
      if (
        (option.args.length && !isNewExpression && !isAssignment(lastArg)) ||
        (isAssignment(lastArg) && isAssignmentComplete(lastArg))
      ) {
        suggestions.push(
          ...getFinalSuggestions({
            comma: true,
          })
        );
      } else if (isNewExpression || (isAssignment(nodeArg) && !isAssignmentComplete(nodeArg))) {
        // Otherwise try to complete the expression suggesting some columns
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(
            types[0] === 'column' ? ['any'] : types,
            command.name,
            option.name,
            getFieldsByType,
            {
              functions: option.name === 'by',
              fields: true,
            }
          ))
        );

        if (command.name === 'stats' && isNewExpression) {
          suggestions.push(buildNewVarDefinition(findNewVariable(anyVariables)));
        }
      }
    }
  }
  return suggestions;
}
