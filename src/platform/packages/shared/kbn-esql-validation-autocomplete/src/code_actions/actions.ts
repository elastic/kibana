/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { distance } from 'fastest-levenshtein';
import {
  type AstProviderFn,
  type ESQLAst,
  type EditorError,
  type ESQLMessage,
  isIdentifier,
} from '@kbn/esql-ast';
import { uniqBy } from 'lodash';
import {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from '../shared/resources_helpers';
import {
  getAllFunctions,
  getCommandDefinition,
  isColumnItem,
  isSourceItem,
  shouldBeQuotedText,
} from '../shared/helpers';
import { ESQLCallbacks } from '../shared/types';
import { buildQueryForFieldsFromSource } from '../validation/helpers';
import { DOUBLE_BACKTICK, SINGLE_TICK_REGEX, METADATA_FIELDS } from '../shared/constants';
import type { CodeAction, Callbacks, CodeActionOptions } from './types';
import { getAstContext } from '../shared/context';
import { wrapAsEditorMessage } from './utils';

function getFieldsByTypeRetriever(queryString: string, resourceRetriever?: ESQLCallbacks) {
  const helpers = getFieldsByTypeHelper(queryString, resourceRetriever);
  return {
    getFieldsByType: async (expectedType: string | string[] = 'any', ignored: string[] = []) => {
      const fields = await helpers.getFieldsByType(expectedType, ignored);
      return fields;
    },
    getFieldsMap: helpers.getFieldsMap,
  };
}

function getPolicyRetriever(resourceRetriever?: ESQLCallbacks) {
  const helpers = getPolicyHelper(resourceRetriever);
  return {
    getPolicies: async () => {
      const policies = await helpers.getPolicies();
      return policies.map(({ name }) => name);
    },
    getPolicyFields: async (policy: string) => {
      const metadata = await helpers.getPolicyMetadata(policy);
      return metadata?.enrichFields || [];
    },
  };
}

function getSourcesRetriever(resourceRetriever?: ESQLCallbacks) {
  const helper = getSourcesHelper(resourceRetriever);
  return async () => {
    const list = (await helper()) || [];
    // hide indexes that start with .
    return list.filter(({ hidden }) => !hidden).map(({ name }) => name);
  };
}

export const getCompatibleFunctionDefinitions = (
  command: string,
  option: string | undefined
): string[] => {
  const fnSupportedByCommand = getAllFunctions({ type: ['scalar', 'agg'] }).filter(
    ({ name, supportedCommands, supportedOptions }) =>
      option ? supportedOptions?.includes(option) : supportedCommands.includes(command)
  );
  return fnSupportedByCommand.map(({ name }) => name);
};

function createAction(title: string, solution: string, error: EditorError): CodeAction {
  return {
    title,
    diagnostics: [error],
    kind: 'quickfix',
    edits: [
      {
        range: error,
        text: solution,
      },
    ],
  };
}

async function getSpellingPossibilities(fn: () => Promise<string[]>, errorText: string) {
  const allPossibilities = await fn();
  const allSolutions = allPossibilities.reduce((solutions, item) => {
    if (distance(item, errorText) < 3) {
      solutions.push(item);
    }
    return solutions;
  }, [] as string[]);
  // filter duplicates
  return Array.from(new Set(allSolutions));
}

async function getSpellingActionForColumns(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  options: CodeActionOptions,
  { getFieldsByType, getPolicies, getPolicyFields }: Partial<Callbacks>
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  if (!getFieldsByType || !getPolicyFields) {
    return [];
  }
  // @TODO add variables support
  const possibleFields = await getSpellingPossibilities(async () => {
    const availableFields = (await getFieldsByType('any')).map(({ name }) => name);
    const enrichPolicies = ast.filter(({ name }) => name === 'enrich');
    if (enrichPolicies.length) {
      const enrichPolicyNames = enrichPolicies.flatMap(({ args }) =>
        args.filter(isSourceItem).map(({ name }) => name)
      );
      const enrichFields = await Promise.all(enrichPolicyNames.map(getPolicyFields));
      availableFields.push(...enrichFields.flat());
    }
    return availableFields;
  }, errorText);
  return wrapIntoSpellingChangeAction(error, possibleFields);
}

function extractUnquotedFieldText(
  query: string,
  errorType: string,
  ast: ESQLAst,
  possibleStart: number,
  end: number
) {
  if (errorType === 'syntaxError') {
    // scope it down to column items for now
    const { node } = getAstContext(query, ast, possibleStart - 1);
    if (node && (isColumnItem(node) || isIdentifier(node))) {
      return {
        start: node.location.min + 1,
        name: query.substring(node.location.min, end).trimEnd(),
      };
    }
  }
  return { start: possibleStart + 1, name: query.substring(possibleStart, end - 1).trimEnd() };
}

async function getQuotableActionForColumns(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  options: CodeActionOptions,
  { getFieldsByType }: Partial<Callbacks>
): Promise<CodeAction[]> {
  const commandEndIndex = ast.find(
    (command) =>
      error.startColumn > command.location.min && error.startColumn < command.location.max
  )?.location.max;

  // the error received is unknwonColumn here, but look around the column to see if there's more
  // which broke the grammar and the validation code couldn't identify as unquoted column
  const remainingCommandText = queryString.substring(
    error.endColumn - 1,
    commandEndIndex ? commandEndIndex + 1 : undefined
  );
  const stopIndex = Math.max(
    /[()]/.test(remainingCommandText)
      ? remainingCommandText.indexOf(')')
      : /,/.test(remainingCommandText)
      ? remainingCommandText.indexOf(',') - 1
      : /\s/.test(remainingCommandText)
      ? remainingCommandText.indexOf(' ')
      : remainingCommandText.length,
    0
  );
  const possibleUnquotedText = queryString.substring(
    error.endColumn - 1,
    error.endColumn + stopIndex
  );
  const { start, name: errorText } = extractUnquotedFieldText(
    queryString,
    error.code || 'syntaxError',
    ast,
    error.startColumn - 1,
    error.endColumn + possibleUnquotedText.length - 1
  );
  const actions: CodeAction[] = [];
  if (shouldBeQuotedText(errorText)) {
    const solution = `\`${errorText.replace(SINGLE_TICK_REGEX, DOUBLE_BACKTICK)}\``;
    if (!getFieldsByType) {
      if (!options.relaxOnMissingCallbacks) {
        return [];
      }
      const textHasAlreadyQuotes = /`/.test(errorText);
      if (textHasAlreadyQuotes) {
        return [];
      }
      actions.push(
        createAction(
          i18n.translate('kbn-esql-validation-autocomplete.esql.quickfix.replaceWithSolution', {
            defaultMessage: 'Did you mean {solution} ?',
            values: {
              solution,
            },
          }),
          solution,
          { ...error, startColumn: start, endColumn: start + errorText.length } // override the location
        )
      );
    } else {
      const availableFields = new Set((await getFieldsByType('any')).map(({ name }) => name));
      if (availableFields.has(errorText) || availableFields.has(solution)) {
        actions.push(
          createAction(
            i18n.translate('kbn-esql-validation-autocomplete.esql.quickfix.replaceWithSolution', {
              defaultMessage: 'Did you mean {solution} ?',
              values: {
                solution,
              },
            }),
            solution,
            { ...error, startColumn: start, endColumn: start + errorText.length } // override the location
          )
        );
      }
    }
  }
  return actions;
}

async function getSpellingActionForIndex(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  options: CodeActionOptions,
  { getSources }: Partial<Callbacks>
) {
  if (!getSources) {
    return [];
  }
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const possibleSources = await getSpellingPossibilities(async () => {
    // Handle fuzzy names via truncation to test levenstein distance
    const sources = await getSources();
    if (errorText.endsWith('*')) {
      return sources.map((source) =>
        source.length > errorText.length ? source.substring(0, errorText.length - 1) + '*' : source
      );
    }
    return sources;
  }, errorText);
  return wrapIntoSpellingChangeAction(error, possibleSources);
}

async function getSpellingActionForPolicies(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  options: CodeActionOptions,
  { getPolicies }: Partial<Callbacks>
) {
  if (!getPolicies) {
    return [];
  }
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const possiblePolicies = await getSpellingPossibilities(getPolicies, errorText);
  return wrapIntoSpellingChangeAction(error, possiblePolicies);
}

async function getSpellingActionForFunctions(
  error: EditorError,
  queryString: string,
  ast: ESQLAst
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  // fallback to the last command if not found
  const commandContext =
    ast.find(
      (command) =>
        error.startColumn > command.location.min && error.startColumn < command.location.max
    ) || ast[ast.length - 1];
  if (!commandContext) {
    return [];
  }
  const possibleSolutions = await getSpellingPossibilities(
    async () =>
      getCompatibleFunctionDefinitions(commandContext.name, undefined).concat(
        // support nested expressions in STATS
        commandContext.name === 'stats' ? getCompatibleFunctionDefinitions('eval', undefined) : []
      ),
    errorText.substring(0, errorText.lastIndexOf('(')).toLowerCase() // reduce a bit the distance check making al lowercase
  );
  return wrapIntoSpellingChangeAction(
    error,
    possibleSolutions.map((fn) => `${fn}${errorText.substring(errorText.lastIndexOf('('))}`)
  );
}

async function getSpellingActionForMetadata(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  options: CodeActionOptions
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const allSolutions = METADATA_FIELDS.reduce((solutions, item) => {
    const dist = distance(item, errorText);
    if (dist < 3) {
      solutions.push(item);
    }
    return solutions;
  }, [] as string[]);
  // filter duplicates
  const possibleMetafields = Array.from(new Set(allSolutions));
  return wrapIntoSpellingChangeAction(error, possibleMetafields);
}

async function getSpellingActionForEnrichMode(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  options: CodeActionOptions,
  _callbacks: Partial<Callbacks>
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const commandContext =
    ast.find((command) => command.location.max > error.endColumn) || ast[ast.length - 1];
  if (!commandContext) {
    return [];
  }
  const commandDef = getCommandDefinition(commandContext.name);
  const allModes =
    commandDef.modes?.flatMap(({ values, prefix }) =>
      values.map(({ name }) => `${prefix || ''}${name}`)
    ) || [];
  const possibleEnrichModes = await getSpellingPossibilities(async () => allModes, errorText);
  // if no possible solution is found, push all modes
  if (!possibleEnrichModes.length) {
    possibleEnrichModes.push(...allModes);
  }
  return wrapIntoSpellingChangeAction(error, possibleEnrichModes);
}

function wrapIntoSpellingChangeAction(
  error: EditorError,
  possibleSolution: string[]
): CodeAction[] {
  return possibleSolution.map((solution) =>
    createAction(
      // @TODO: workout why the tooltip is truncating the title here
      i18n.translate('kbn-esql-validation-autocomplete.esql.quickfix.replaceWithSolution', {
        defaultMessage: 'Did you mean {solution} ?',
        values: {
          solution,
        },
      }),
      solution,
      error
    )
  );
}

function extractQuotedText(rawText: string, error: EditorError) {
  return rawText.substring(error.startColumn - 2, error.endColumn);
}

function inferCodeFromError(
  error: EditorError & { owner?: string },
  ast: ESQLAst,
  rawText: string
) {
  if (error.message.endsWith('expecting QUOTED_STRING')) {
    const value = extractQuotedText(rawText, error);
    return /^'(.)*'$/.test(value) ? 'wrongQuotes' : undefined;
  }
  if (error.message.startsWith('SyntaxError: token recognition error at:')) {
    // scope it down to column items for now
    const { node } = getAstContext(rawText, ast, error.startColumn - 2);
    return node && (isColumnItem(node) || isIdentifier(node)) ? 'quotableFields' : undefined;
  }
}

export async function getActions(
  innerText: string,
  markers: Array<ESQLMessage | EditorError>,
  astProvider: AstProviderFn,
  options: CodeActionOptions = {},
  resourceRetriever?: ESQLCallbacks
): Promise<CodeAction[]> {
  const actions: CodeAction[] = [];
  if (markers.length === 0) {
    return actions;
  }
  const editorMarkers = wrapAsEditorMessage('error', markers);
  const { ast } = await astProvider(innerText);

  const queryForFields = buildQueryForFieldsFromSource(innerText, ast);
  const { getFieldsByType } = getFieldsByTypeRetriever(queryForFields, resourceRetriever);
  const getSources = getSourcesRetriever(resourceRetriever);
  const { getPolicies, getPolicyFields } = getPolicyRetriever(resourceRetriever);

  const callbacks = {
    getFieldsByType: resourceRetriever?.getColumnsFor ? getFieldsByType : undefined,
    getSources: resourceRetriever?.getSources ? getSources : undefined,
    getPolicies: resourceRetriever?.getPolicies ? getPolicies : undefined,
    getPolicyFields: resourceRetriever?.getPolicies ? getPolicyFields : undefined,
  };

  // Markers are sent only on hover and are limited to the hovered area
  // so unless there are multiple error/markers for the same area, there's just one
  // in some cases, like syntax + semantic errors (i.e. unquoted fields eval field-1 ), there might be more than one
  for (const error of editorMarkers) {
    const code = error.code ?? inferCodeFromError(error, ast, innerText);
    switch (code) {
      case 'unknownColumn': {
        const [columnsSpellChanges, columnsQuotedChanges] = await Promise.all([
          getSpellingActionForColumns(error, innerText, ast, options, callbacks),
          getQuotableActionForColumns(error, innerText, ast, options, callbacks),
        ]);
        actions.push(...(columnsQuotedChanges.length ? columnsQuotedChanges : columnsSpellChanges));
        break;
      }
      case 'quotableFields': {
        const columnsQuotedChanges = await getQuotableActionForColumns(
          error,
          innerText,
          ast,
          options,
          callbacks
        );
        actions.push(...columnsQuotedChanges);
        break;
      }
      case 'unknownIndex':
        const indexSpellChanges = await getSpellingActionForIndex(
          error,
          innerText,
          ast,
          options,
          callbacks
        );
        actions.push(...indexSpellChanges);
        break;
      case 'unknownPolicy':
        const policySpellChanges = await getSpellingActionForPolicies(
          error,
          innerText,
          ast,
          options,
          callbacks
        );
        actions.push(...policySpellChanges);
        break;
      case 'unknownFunction':
        const fnsSpellChanges = await getSpellingActionForFunctions(error, innerText, ast);
        actions.push(...fnsSpellChanges);
        break;
      case 'unknownMetadataField':
        const metadataSpellChanges = await getSpellingActionForMetadata(
          error,
          innerText,
          ast,
          options
        );
        actions.push(...metadataSpellChanges);
        break;
      case 'wrongQuotes':
        // it is a syntax error, so location won't be helpful here
        const errorText = extractQuotedText(innerText, error);
        actions.push(
          createAction(
            i18n.translate('kbn-esql-validation-autocomplete.esql.quickfix.replaceWithQuote', {
              defaultMessage: 'Change quote to " (double)',
            }),
            errorText.replaceAll("'", '"'),
            // override the location
            {
              ...error,
              startColumn: error.startColumn - 1,
              endColumn: error.startColumn + errorText.length,
            }
          )
        );
        break;
      case 'unsupportedSettingCommandValue':
        const enrichModeSpellChanges = await getSpellingActionForEnrichMode(
          error,
          innerText,
          ast,
          options,
          callbacks
        );
        actions.push(...enrichModeSpellChanges);
        break;
      default:
        break;
    }
  }
  return uniqBy(actions, ({ edits }) => edits[0].text);
}
