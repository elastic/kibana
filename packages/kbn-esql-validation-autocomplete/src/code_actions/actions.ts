/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import levenshtein from 'js-levenshtein';
import type { AstProviderFn, ESQLAst, ESQLCommand, EditorError, ESQLMessage } from '@kbn/esql-ast';
import {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from '../shared/resources_helpers';
import {
  getAllFunctions,
  getCommandDefinition,
  isSourceItem,
  shouldBeQuotedText,
} from '../shared/helpers';
import { ESQLCallbacks } from '../shared/types';
import { buildQueryForFieldsFromSource } from '../validation/helpers';
import { DOUBLE_BACKTICK, SINGLE_TICK_REGEX } from '../shared/constants';
import type { CodeAction, Callbacks } from './types';
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

export function getMetaFieldsRetriever(
  queryString: string,
  commands: ESQLCommand[],
  callbacks?: ESQLCallbacks
) {
  return async () => {
    if (!callbacks || !callbacks.getMetaFields) {
      return [];
    }
    return await callbacks.getMetaFields();
  };
}

export const getCompatibleFunctionDefinitions = (
  command: string,
  option: string | undefined
): string[] => {
  const fnSupportedByCommand = getAllFunctions({ type: ['eval', 'agg'] }).filter(
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
    const distance = levenshtein(item, errorText);
    if (distance < 3) {
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
  { getFieldsByType, getPolicies, getPolicyFields }: Callbacks
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  // @TODO add variables support
  const possibleFields = await getSpellingPossibilities(async () => {
    const availableFields = await getFieldsByType('any');
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

async function getQuotableActionForColumns(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  { getFieldsByType }: Callbacks
): Promise<CodeAction[]> {
  const commandEndIndex = ast.find((command) => command.location.max > error.endColumn)?.location
    .max;
  // the error received is unknwonColumn here, but look around the column to see if there's more
  // which broke the grammar and the validation code couldn't identify as unquoted column
  const remainingCommandText = queryString.substring(
    error.endColumn - 1,
    commandEndIndex ? commandEndIndex + 1 : undefined
  );
  const stopIndex = Math.max(
    /,/.test(remainingCommandText)
      ? remainingCommandText.indexOf(',')
      : /\s/.test(remainingCommandText)
      ? remainingCommandText.indexOf(' ')
      : remainingCommandText.length,
    0
  );
  const possibleUnquotedText = queryString.substring(
    error.endColumn - 1,
    error.endColumn + stopIndex
  );
  const errorText = queryString
    .substring(error.startColumn - 1, error.endColumn + possibleUnquotedText.length)
    .trimEnd();
  const actions: CodeAction[] = [];
  if (shouldBeQuotedText(errorText)) {
    const availableFields = new Set(await getFieldsByType('any'));
    const solution = `\`${errorText.replace(SINGLE_TICK_REGEX, DOUBLE_BACKTICK)}\``;
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
          { ...error, endColumn: error.startColumn + errorText.length } // override the location
        )
      );
    }
  }
  return actions;
}

async function getSpellingActionForIndex(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  { getSources }: Callbacks
) {
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
  { getPolicies }: Callbacks
) {
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
  { getMetaFields }: Callbacks
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const possibleMetafields = await getSpellingPossibilities(getMetaFields, errorText);
  return wrapIntoSpellingChangeAction(error, possibleMetafields);
}

async function getSpellingActionForEnrichMode(
  error: EditorError,
  queryString: string,
  ast: ESQLAst,
  _callbacks: Callbacks
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

function inferCodeFromError(error: EditorError & { owner?: string }, rawText: string) {
  if (error.message.endsWith('expecting QUOTED_STRING')) {
    const value = extractQuotedText(rawText, error);
    return /^'(.)*'$/.test(value) ? 'wrongQuotes' : undefined;
  }
}

export async function getActions(
  innerText: string,
  markers: Array<ESQLMessage | EditorError>,
  astProvider: AstProviderFn,
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
  const getMetaFields = getMetaFieldsRetriever(innerText, ast, resourceRetriever);

  const callbacks = {
    getFieldsByType,
    getSources,
    getPolicies,
    getPolicyFields,
    getMetaFields,
  };

  // Markers are sent only on hover and are limited to the hovered area
  // so unless there are multiple error/markers for the same area, there's just one
  // in some cases, like syntax + semantic errors (i.e. unquoted fields eval field-1 ), there might be more than one
  for (const error of editorMarkers) {
    const code = error.code ?? inferCodeFromError(error, innerText);
    switch (code) {
      case 'unknownColumn':
        const [columnsSpellChanges, columnsQuotedChanges] = await Promise.all([
          getSpellingActionForColumns(error, innerText, ast, callbacks),
          getQuotableActionForColumns(error, innerText, ast, callbacks),
        ]);
        actions.push(...(columnsQuotedChanges.length ? columnsQuotedChanges : columnsSpellChanges));
        break;
      case 'unknownIndex':
        const indexSpellChanges = await getSpellingActionForIndex(error, innerText, ast, callbacks);
        actions.push(...indexSpellChanges);
        break;
      case 'unknownPolicy':
        const policySpellChanges = await getSpellingActionForPolicies(
          error,
          innerText,
          ast,
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
          callbacks
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
          callbacks
        );
        actions.push(...enrichModeSpellChanges);
        break;
      default:
        break;
    }
  }
  return actions;
}
