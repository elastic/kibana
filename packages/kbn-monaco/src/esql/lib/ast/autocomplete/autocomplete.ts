/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { monaco } from '../../../../monaco_imports';
import type { AutocompleteCommandDefinition, ESQLCallbacks } from './types';
import { nonNullable } from '../ast_helpers';
import {
  getColumnHit,
  getCommandDefinition,
  getCommandOption,
  getFunctionDefinition,
  getLastCharFromTrimmed,
  isAssignment,
  isColumnItem,
  isFunctionItem,
  isIncompleteItem,
  isLiteralItem,
  isOptionItem,
  isSourceItem,
  monacoPositionToOffset,
} from '../shared/helpers';
import { collectVariables } from '../shared/variables';
import type {
  AstProviderFn,
  ESQLAstItem,
  ESQLCommand,
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
  mathCommandDefinition,
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
} from './factories';
import { EDITOR_MARKER } from '../shared/constants';
import { getAstContext } from '../shared/context';

type GetSourceFn = () => Promise<AutocompleteCommandDefinition[]>;
type GetFieldsByTypeFn = (type: string | string[]) => Promise<AutocompleteCommandDefinition[]>;
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

export async function suggest(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.CompletionContext,
  astProvider: AstProviderFn,
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

  const { ast } = await astProvider(finalText);

  const astContext = getAstContext(innerText, ast, offset);
  const { getFieldsByType, getFieldsMap } = getFieldsByTypeRetriever(resourceRetriever);
  const getSources = getSourcesRetriever(resourceRetriever);
  const { getPolicies, getPolicyMetadata } = getPolicyRetriever(resourceRetriever);

  console.log({ innerText, finalText, astContext, offset, offsetChar: innerText[offset] });

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
      getPolicies,
      getPolicyMetadata
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
    return getFunctionArgsSuggestions(
      innerText,
      ast,
      astContext.node,
      astContext.command,
      getFieldsByType,
      getFieldsMap,
      getPolicyMetadata
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

function isAssignmentComplete(node: ESQLFunction) {
  const assignExpression = node.args?.[1];
  return Boolean(assignExpression && Array.isArray(assignExpression) && assignExpression.length);
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
      if (isAssignment(node) && !isAssignmentComplete(node)) {
        return false;
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
  return true;
}

function extractFinalTypeFromArg(
  arg: ESQLAstItem,
  references: Pick<ReferenceMaps, 'fields' | 'variables'>
) {
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
  const fnDefinition = getFunctionDefinition(arg.name)!;
  const cleanedArgs = arg.args.filter(
    (fnArg) => !(isColumnItem(fnArg) && fnArg.name === EDITOR_MARKER)
  );
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
  console.log({ arg, fnDefinition, cleanedArgs });
  if (!argLengthCheck) {
    return { complete: false, reason: 'fewArgs' };
  }
  const hasCorrectTypes = fnDefinition.signatures.some((def) => {
    return arg.args.every((a, index) => {
      if (def.infiniteParams) {
        return true;
      }
      console.log({ def: def.params[index], argType: extractFinalTypeFromArg(a, references) });
      return def.params[index].type === extractFinalTypeFromArg(a, references);
    });
  });
  if (!hasCorrectTypes) {
    return { complete: false, reason: 'wrongTypes' };
  }
  return { complete: true };
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
  getPolicies: GetPoliciesFn,
  getPolicyMetadata: GetPolicyMetadataFn
) {
  const commandDef = getCommandDefinition(command.name);
  // get the argument position
  let argIndex = command.args.length;
  const prevIndex = Math.max(argIndex - 1, 0);
  const lastArg = command.args.filter(
    (fnArg) => !(isColumnItem(fnArg) && fnArg.name === EDITOR_MARKER)
  )[prevIndex];
  if (isIncompleteItem(lastArg)) {
    argIndex = prevIndex;
  }

  // if a node is not specified use the lastArg
  // mind to give priority to node as lastArg might be a function root
  // => "a > b and c == d" gets translated into and( gt(a, b) , eq(c, d) ) => hence "and" is lastArg
  const nodeArg = node || lastArg;
  // A new expression is considered either
  // * just after a command name => i.e. ... | STATS <here>
  // * or after a comma => i.e. STATS fieldA, <here>
  const isNewExpression = getLastCharFromTrimmed(innerText) === ',' || argIndex === 0;

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
    // i.e. ... | EVAL a, <here>
    if (isNewExpression && commandDef.signature.multipleParams) {
      argDef = commandDef.signature.params[0];
    }
    // this is the case where there's an argument, but it's of the wrong type
    // i.e. ... | WHERE numberField <here> (WHERE wants a boolean expression!)
    // i.e. ... | STATS numberfield <here> (STATS wants a function expression!)
    if (!isNewExpression && !Array.isArray(lastArg)) {
      const prevArg = commandDef.signature.params[prevIndex];
      // in some cases we do not want to go back as the command only accepts a literal
      // i.e. LIMIT 5 <suggest> -> that's it, so no argDef should be assigned
      if (!isLiteralItem(nodeArg) || !prevArg.literalOnly) {
        argDef = commandDef.signature.params[prevIndex];
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
  console.log({
    canHaveAssignments,
    isNewExpression,
    lastArg,
    incomplete: isIncompleteItem(nodeArg),
    argDef,
    prevArg: commandDef.signature.params[prevIndex],
    node,
    innerText,
    argIndex,
    command,
  });

  // Commands with assignment are a bit more complex to handle than others
  // as assignments need some carefull completition
  // if (canHaveAssignments) {
  //   if (isNewExpression) {
  //     // ... | STATS <suggest here>
  //     // ... | EVAL <suggest here>
  //     // ... | ROW <suggest here>

  //     // suggest either a variable or a function to start with

  //     // Suggest a new variable with assignment
  //     // i.e. "var1 ="
  //     suggestions.push(buildNewVarDefinition(findNewVariable(anyVariables)));

  //     // Next suggest functions (eval, stats) or existing variables created from previous commands
  //     // => fields will be suggested later
  //     suggestions.push(
  //       ...(await getAllSuggestionsByType(['any'], command.name, getFieldsByType, {
  //         // row command cannot use functions, so be careful to disabled them here in that case
  //         functions: command.name !== 'row',
  //         fields: false,
  //         // @TODO: maybe in the future we would like to fine tune this
  //         // to avoid this kind of validation false negative:
  //         // ROW var1 = var0 + 1, var0 = 1
  //         variables: anyVariables,
  //       }))
  //     );
  //   }
  //   // ... | STATS something <suggest>
  //   // ... | EVAL something <suggest>
  //   // ... | ROW something <suggest>
  //   if (!isNewExpression && lastArg && !isIncompleteItem(lastArg)) {
  //     // If it's a field then suggest builtin functions (+, -, etc...)
  //     // STATS is skipped here (argDef !== "function") as it does not accept a field at root expression level
  //     if (argDef.type !== 'function') {
  //       const argType = extractFinalTypeFromArg(lastArg, {
  //         fields: fieldsMap,
  //         variables: anyVariables,
  //       });
  //       if (argType) {
  //         suggestions.push(...getBuiltinCompatibleFunctionDefinition(command.name, argType));
  //       }
  //     } else {
  //       // ... | STATS a
  //       // ... | STATS a =
  //       if (isColumnItem(lastArg)) {
  //         // i.e.
  //         // ... | stats a
  //         suggestions.push(getAssignmentDefinitionCompletitionItem());
  //       }
  //       console.log({
  //         isAssignment: isAssignment(lastArg),
  //         isAssignComplete: isAssignment(lastArg) && isAssignmentComplete(lastArg),
  //       });
  //       if (isAssignment(lastArg) && !isAssignmentComplete(lastArg)) {
  //         // i.e.
  //         // ... | stats a =
  //         suggestions.push(
  //           ...(await getAllSuggestionsByType(['any'], command.name, getFieldsByType, {
  //             functions: true,
  //             fields: command.name !== 'stats',
  //           }))
  //         );
  //       }
  //     }
  //   }
  // }

  // If the special logic above didn't add anything,
  // then go for the generic signature based suggestion where possible
  // or use command-specific logic as last resort
  if (suggestions.length === 0) {
    // in this flow there's a clear plan here from argument definitions so try to follow it
    if (argDef) {
      if (argDef.type === 'function' || argDef.type === 'any') {
        console.log({
          argDef,
          nodeArg,
          isAssignment: isAssignment(nodeArg),
          isAssignComplete: isAssignment(nodeArg) && isAssignmentComplete(nodeArg),
          isColumn: isColumnItem(nodeArg),
        });
        if (isColumnItem(nodeArg)) {
          // i.e.
          // ... | STATS a
          // ... | EVAL a
          suggestions.push(getAssignmentDefinitionCompletitionItem());
        }
        if (isNewExpression || (isAssignment(nodeArg) && !isAssignmentComplete(nodeArg))) {
          // i.e.
          // ... | STATS
          // ... | STATS ...,
          // ... | EVAL
          // ... | EVAL ...,
          if (isNewExpression) {
            suggestions.push(buildNewVarDefinition(findNewVariable(anyVariables)));
          }
          // ... | STATS a =
          // ... | EVAL a =
          suggestions.push(
            ...(await getAllSuggestionsByType(['any'], command.name, getFieldsByType, {
              functions: true,
              fields: false,
              variables: nodeArg ? undefined : anyVariables,
            }))
          );
        }
      }

      // Suggest fields or variables
      if (argDef.type === 'column' || argDef.type === 'any') {
        // ... | <COMMAND> <suggest>
        if (!nodeArg) {
          suggestions.push(
            ...(await getAllSuggestionsByType(
              [argDef.innerType || 'any'],
              command.name,
              getFieldsByType,
              {
                functions: canHaveAssignments,
                fields: true,
                variables: anyVariables,
              }
            ))
          );
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
          suggestions.push(...getCompatibleLiterals(command.name, [argDef.type], [argDef.name]));
        } else {
          // or it can be anything else as long as it is of the right type and the end (i.e. column or function)
          if (!nodeArg) {
            // ... | WHERE <suggest>
            // In this case start suggesting something not strictly based on type
            suggestions.push(
              ...(await getAllSuggestionsByType(['any'], command.name, getFieldsByType, {
                functions: true,
                fields: true,
                variables: anyVariables,
              }))
            );
          } else {
            // if something is already present, leverage its type to suggest something in context
            const nodeArgType = extractFinalTypeFromArg(nodeArg, references);
            console.log({
              node,
              lastArg,
              argDef,
              nodeArgType,
              fieldsMap,
              nodeArg,
            });
            // These cases can happen here, so need to identify each and provide the right suggestion
            // i.e. ... | WHERE field <suggest>
            // i.e. ... | WHERE field + <suggest>
            // i.e. ... | WHERE field >= <suggest>
            // i.e. ... | WHERE field > 0 <suggest>
            // i.e. ... | WHERE field + otherN <suggest>

            if (nodeArgType) {
              if (isFunctionItem(nodeArg)) {
                const isFnComplete = isFunctionArgComplete(nodeArg, references);
                console.log({ isFunctionArgComplete: isFnComplete });
                if (isFnComplete.complete) {
                  // i.e. ... | WHERE field > 0 <suggest>
                  // i.e. ... | WHERE field + otherN <suggest>
                  suggestions.push(
                    ...getBuiltinCompatibleFunctionDefinition(command.name, nodeArgType)
                  );
                } else {
                  // i.e. ... | WHERE field >= <suggest>
                  // i.e. ... | WHERE field + <suggest>
                  // i.e. ... | WHERE field and <suggest>

                  // Because it's an incomplete function, need to extract the type of the current argument
                  // and suggest the next argument based on types

                  // pick the last arg and check its type to verify whether is incomplete for the given function
                  const cleanedArgs = nodeArg.args.filter(
                    (fnArg) => !(isColumnItem(fnArg) && fnArg.name === EDITOR_MARKER)
                  );
                  const nestedType = extractFinalTypeFromArg(
                    nodeArg.args[cleanedArgs.length - 1],
                    references
                  );
                  console.log({ nestedType, arg: nodeArg.args, fieldsMap, anyVariables });

                  if (isFnComplete.reason === 'fewArgs') {
                    suggestions.push(
                      ...(await getAllSuggestionsByType(
                        [nestedType || nodeArgType],
                        command.name,
                        getFieldsByType,
                        {
                          functions: true,
                          fields: true,
                          variables: anyVariables,
                        }
                      ))
                    );
                  }
                  if (isFnComplete.reason === 'wrongTypes') {
                    if (nestedType) {
                      // suggest something to complete the builtin function
                      if (nestedType !== argDef.type) {
                        suggestions.push(
                          ...getBuiltinCompatibleFunctionDefinition(command.name, nestedType, [
                            argDef.type,
                          ])
                        );
                      }
                    }
                  }
                }
              } else {
                // i.e. ... | WHERE field <suggest>
                suggestions.push(
                  ...getBuiltinCompatibleFunctionDefinition(command.name, nodeArgType)
                );
              }
            }
          }
        }

        // if there's already some expression which ends as boolean
        // then suggest AND/OR or other compatible functions (IN, NOT, ...)
        // if (isBooleanType(lastArg, { fields: fieldsMap, variables: anyVariables })) {
        //   suggestions.push(...getBuiltinCompatibleFunctionDefinition(command.name, 'boolean'));
        // } else {
        // if (isFunctionItem(lastArg) && lastArg.args.length) {
        //   const nestedType = extractFinalTypeFromArg(lastArg.args[0], {
        //     fields: fieldsMap,
        //     variables: anyVariables,
        //   });
        //   // suggest a function or a field compatible with the existing arguments
        //   if (nestedType) {
        //     suggestions.push(
        //       ...(await getAllSuggestionsByType([nestedType], command.name, getFieldsByType, {
        //         functions: true,
        //         fields: true,
        //         variables: anyVariables,
        //       }))
        //     );
        //   }
        // } else {
        //   const passedType = extractFinalTypeFromArg(lastArg, {
        //     fields: fieldsMap,
        //     variables: anyVariables,
        //   });
        //   console.log({ argDef, passedType });
        //   if (passedType) {
        //     suggestions.push(...getBuiltinCompatibleFunctionDefinition(command.name, passedType));
        //   }
        //   // }
        // }
      }
      // FROM <suggest>
      // ... | ENRICH <suggest>
      if (argDef.type === 'source') {
        if (argDef.innerType === 'policy') {
          const policies = await getPolicies();
          suggestions.push(
            ...(policies.length ? policies : [buildNoPoliciesAvailableDefinition()])
          );
        } else {
          // @TODO: filter down the suggestions here based on other existing sources defined
          suggestions.push(...(await getSources()));
        }
      }
      // if (['string', 'number', 'boolean'].includes(argDef.type) && !argDef.values) {
      //   suggestions.push(...getCompatibleLiterals(command.name, [argDef.type], [argDef.name]));
      // }
    } else {
      // This is a duplication of some logic few lines above as WHERE does not support assignments
      // if (command.name === 'where') {
      //   // i.e. ...| WHERE anyField <suggestion here>
      //   if (isColumnItem(lastArg) || isLiteralItem(lastArg)) {
      //     let argType = 'boolean';
      //     if (isLiteralItem(lastArg)) {
      //       argType = lastArg.literalType;
      //     }
      //     if (isColumnItem(lastArg)) {
      //       const hit = getColumnHit(lastArg.name, {
      //         fields: fieldsMap,
      //         variables: anyVariables,
      //       });
      //       if (hit) {
      //         argType = hit.type;
      //       }
      //     }
      //     suggestions.push(
      //       ...getBuiltinCompatibleFunctionDefinition(command.name, argType, ['boolean'])
      //     );
      //   } else {
      //     if (isBooleanType(lastArg, { fields: fieldsMap, variables: anyVariables })) {
      //       // suggest AND and OR
      //       suggestions.push(
      //         ...getBuiltinCompatibleFunctionDefinition(command.name, 'boolean', ['boolean'])
      //       );
      //     } else {
      //       suggestions.push(
      //         ...(await getAllSuggestionsByType(['any'], command.name, getFieldsByType, {
      //           functions: true,
      //           fields: true,
      //           variables: anyVariables,
      //         }))
      //       );
      //     }
      //   }
      // }
    }
  }

  const nonOptionArgs = command.args.filter(
    (arg) => !isOptionItem(arg) && !Array.isArray(arg) && !arg.incomplete
  );
  // Perform some checks on mandatory arguments
  const mandatoryArgsAlreadyPresent =
    (commandDef.signature.multipleParams && nonOptionArgs.length > 1) ||
    nonOptionArgs.length >=
      commandDef.signature.params.filter(({ optional }) => !optional).length ||
    argDef?.type === 'function';

  // check if declared args are fully valid for the given command
  const currentArgsAreValidForCommand = areCurrentArgsValid(command, nodeArg, references);

  console.log({ isNewExpression, mandatoryArgsAlreadyPresent, currentArgsAreValidForCommand });
  // latest suggestions: options and final ones
  if (!isNewExpression && mandatoryArgsAlreadyPresent && currentArgsAreValidForCommand) {
    // suggest some command options
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
            completeItem.insertTextRules = 4; // monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
          }
          return completeItem;
        })
      );
    }

    // now suggest pipe or comma
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
    variables,
  }: {
    functions: boolean;
    fields: boolean;
    variables?: Map<string, ESQLVariable[]>;
  }
): Promise<AutocompleteCommandDefinition[]> {
  const filteredFieldsByType = (await (fields
    ? getFieldsByType(types)
    : [])) as AutocompleteCommandDefinition[];

  const filteredVariablesByType: string[] = [];
  if (variables) {
    for (const variable of variables.values()) {
      if (types.includes('any') || types.includes(variable[0].type)) {
        filteredVariablesByType.push(variable[0].name);
      }
    }
  }

  const suggestions = filteredFieldsByType.concat(
    functions ? getCompatibleFunctionDefinition(commandName, types) : [],
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
  fn: ESQLFunction,
  command: ESQLCommand,
  getFieldsByType: GetFieldsByTypeFn,
  getFieldsMap: GetFieldsMapFn,
  getPolicyMetadata: GetPolicyMetadataFn
): Promise<AutocompleteCommandDefinition[]> {
  const fnDefinition = getFunctionDefinition(fn.name);
  if (fnDefinition) {
    const argIndex = Math.max(fn.args.length - 1, 0);
    const types = fnDefinition.signatures.flatMap((signature) => {
      if (signature.params.length > argIndex) {
        return signature.params[argIndex].type;
      }
      if (signature.infiniteParams) {
        return signature.params[0].type;
      }
      return [];
    });

    const suggestions = await getAllSuggestionsByType(types, command.name, getFieldsByType, {
      functions: command.name !== 'stats',
      fields: true,
    });

    const hasMoreMandatoryArgs =
      fnDefinition.signatures[0].params.filter(({ optional }) => !optional).length > argIndex + 1;

    return suggestions.map(({ insertText, ...rest }) => ({
      ...rest,
      insertText: hasMoreMandatoryArgs && !fnDefinition.builtin ? `${insertText},` : insertText,
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
        const anyVariables = collectVariables(
          commands,
          appendEnrichFields(fieldsMap, policyMetadata)
        );

        if (isNewExpression) {
          suggestions.push(buildNewVarDefinition(findNewVariable(anyVariables)));
        }
        if (
          policyMetadata &&
          ((isAssignment(option.args[0]) && !hasSameArgBothSides(option.args[0])) ||
            isNewExpression)
        ) {
          suggestions.push(...buildFieldsDefinitions(policyMetadata.enrichFields));
        }
        if (
          isAssignment(option.args[0]) &&
          hasSameArgBothSides(option.args[0]) &&
          !isNewExpression &&
          lastArg &&
          !isIncompleteItem(lastArg)
        ) {
          suggestions.push(...getBuiltinCompatibleFunctionDefinition(command.name, 'any'));
        }

        if (isAssignment(option.args[0]) && hasSameArgBothSides(option.args[0])) {
          suggestions.push(
            ...getFinalSuggestions({
              comma: true,
            })
          );
        }
      }
    }
  }
  if (optionDef) {
    if (!suggestions.length) {
      const argIndex = Math.max(option.args.length - 1, 0);
      const types = [optionDef.signature.params[argIndex].type].filter(nonNullable);
      if (option.args.length) {
        suggestions.push(
          ...getFinalSuggestions({
            comma: true,
          })
        );
      } else if (!option.args.length || getLastCharFromTrimmed(innerText) === ',') {
        suggestions.push(
          ...(await getAllSuggestionsByType(
            types[0] === 'column' ? ['any'] : types,
            command.name,
            getFieldsByType,
            {
              functions: false,
              fields: true,
            }
          ))
        );
      }
    }
  }
  return suggestions;
}
