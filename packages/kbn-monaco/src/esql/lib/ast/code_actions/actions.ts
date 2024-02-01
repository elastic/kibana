/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import levenshtein from 'js-levenshtein';
import type { monaco } from '../../../../monaco_imports';
import {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from '../shared/resources_helpers';
import { getAllFunctions, isSourceItem, shouldBeQuotedText } from '../shared/helpers';
import { ESQLCallbacks } from '../shared/types';
import { AstProviderFn, ESQLAst, ESQLCommand } from '../types';
import { buildQueryForFieldsFromSource } from '../validation/helpers';

type GetSourceFn = () => Promise<string[]>;
type GetFieldsByTypeFn = (type: string | string[], ignored?: string[]) => Promise<string[]>;
type GetPoliciesFn = () => Promise<string[]>;
type GetPolicyFieldsFn = (name: string) => Promise<string[]>;
type GetMetaFieldsFn = () => Promise<string[]>;

interface Callbacks {
  getSources: GetSourceFn;
  getFieldsByType: GetFieldsByTypeFn;
  getPolicies: GetPoliciesFn;
  getPolicyFields: GetPolicyFieldsFn;
  getMetaFields: GetMetaFieldsFn;
}

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
  option: string | undefined,
  returnTypes?: string[],
  ignored: string[] = []
): string[] => {
  const fnSupportedByCommand = getAllFunctions({ type: ['eval', 'agg'] }).filter(
    ({ name, supportedCommands, supportedOptions }) =>
      (option ? supportedOptions?.includes(option) : supportedCommands.includes(command)) &&
      !ignored.includes(name)
  );
  if (!returnTypes) {
    return fnSupportedByCommand.map(({ name }) => name);
  }
  return fnSupportedByCommand
    .filter((mathDefinition) =>
      mathDefinition.signatures.some(
        (signature) => returnTypes[0] === 'any' || returnTypes.includes(signature.returnType)
      )
    )
    .map(({ name }) => name);
};

function createAction(
  title: string,
  solution: string,
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri
) {
  return {
    title,
    diagnostics: [error],
    kind: 'quickfix',
    edit: {
      edits: [
        {
          resource: uri,
          textEdit: {
            range: error,
            text: solution,
          },
          versionId: undefined,
        },
      ],
    },
    isPreferred: true,
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
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
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
  return wrapIntoSpellingChangeAction(error, uri, possibleFields);
}

async function getQuotableActionForColumns(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  queryString: string,
  ast: ESQLAst,
  { getFieldsByType }: Callbacks
) {
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
  const actions = [];
  if (shouldBeQuotedText(errorText)) {
    const availableFields = new Set(await getFieldsByType('any'));
    const solution = `\`${errorText}\``;
    if (availableFields.has(errorText) || availableFields.has(solution)) {
      actions.push(
        createAction(
          i18n.translate('monaco.esql.quickfix.replaceWithSolution', {
            defaultMessage: 'Did you mean {solution} ?',
            values: {
              solution,
            },
          }),
          solution,
          { ...error, endColumn: error.startColumn + errorText.length }, // override the location
          uri
        )
      );
    }
  }
  return actions;
}

async function getSpellingActionForIndex(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
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
  return wrapIntoSpellingChangeAction(error, uri, possibleSources);
}

async function getSpellingActionForPolicies(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  queryString: string,
  ast: ESQLAst,
  { getPolicies }: Callbacks
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const possiblePolicies = await getSpellingPossibilities(getPolicies, errorText);
  return wrapIntoSpellingChangeAction(error, uri, possiblePolicies);
}

async function getSpellingActionForFunctions(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  queryString: string,
  ast: ESQLAst
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  // fallback to the last command if not found
  const commandContext =
    ast.find((command) => command.location.max > error.endColumn) || ast[ast.length - 1];
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
    uri,
    possibleSolutions.map((fn) => `${fn}${errorText.substring(errorText.lastIndexOf('('))}`)
  );
}

async function getSpellingActionForMetadata(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  queryString: string,
  ast: ESQLAst,
  { getMetaFields }: Callbacks
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const possibleMetafields = await getSpellingPossibilities(getMetaFields, errorText);
  return wrapIntoSpellingChangeAction(error, uri, possibleMetafields);
}

function wrapIntoSpellingChangeAction(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  possibleSolution: string[]
): monaco.languages.CodeAction[] {
  return possibleSolution.map((solution) =>
    createAction(
      // @TODO: workout why the tooltip is truncating the title here
      i18n.translate('monaco.esql.quickfix.replaceWithSolution', {
        defaultMessage: 'Did you mean {solution} ?',
        values: {
          solution,
        },
      }),
      solution,
      error,
      uri
    )
  );
}

function inferCodeFromError(error: monaco.editor.IMarkerData & { owner?: string }) {
  if (error.message.includes('missing STRING')) {
    const [, value] = error.message.split('at ');
    return value.startsWith("'") && value.endsWith("'") ? 'wrongQuotes' : undefined;
  }
}

export async function getActions(
  model: monaco.editor.ITextModel,
  range: monaco.Range,
  context: monaco.languages.CodeActionContext,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
): Promise<monaco.languages.CodeAction[]> {
  const actions: monaco.languages.CodeAction[] = [];
  if (context.markers.length === 0) {
    return actions;
  }
  const innerText = model.getValue();
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
  for (const error of context.markers) {
    const code = error.code ?? inferCodeFromError(error);
    switch (code) {
      case 'unknownColumn':
        const [columnsSpellChanges, columnsQuotedChanges] = await Promise.all([
          getSpellingActionForColumns(error, model.uri, innerText, ast, callbacks),
          getQuotableActionForColumns(error, model.uri, innerText, ast, callbacks),
        ]);
        actions.push(...(columnsQuotedChanges.length ? columnsQuotedChanges : columnsSpellChanges));
        break;
      case 'unknownIndex':
        const indexSpellChanges = await getSpellingActionForIndex(
          error,
          model.uri,
          innerText,
          ast,
          callbacks
        );
        actions.push(...indexSpellChanges);
        break;
      case 'unknownPolicy':
        const policySpellChanges = await getSpellingActionForPolicies(
          error,
          model.uri,
          innerText,
          ast,
          callbacks
        );
        actions.push(...policySpellChanges);
        break;
      case 'unknownFunction':
        const fnsSpellChanges = await getSpellingActionForFunctions(
          error,
          model.uri,
          innerText,
          ast
        );
        actions.push(...fnsSpellChanges);
        break;
      case 'unknownMetadataField':
        const metadataSpellChanges = await getSpellingActionForMetadata(
          error,
          model.uri,
          innerText,
          ast,
          callbacks
        );
        actions.push(...metadataSpellChanges);
        break;
      case 'wrongQuotes':
        // it is a syntax error, so location won't be helpful here
        const [, errorText] = error.message.split('at ');
        actions.push(
          createAction(
            i18n.translate('monaco.esql.quickfix.replaceWithQuote', {
              defaultMessage: 'Change quote to " (double)',
            }),
            errorText.replaceAll("'", '"'),
            // override the location
            { ...error, endColumn: error.startColumn + errorText.length },
            model.uri
          )
        );
        break;
      default:
        break;
    }
  }
  return actions;
}
