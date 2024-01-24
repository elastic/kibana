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
import { ESQLCallbacks } from '../shared/types';
import { AstProviderFn } from '../types';
import { buildQueryForFieldsFromSource } from '../validation/helpers';

type GetSourceFn = () => Promise<string[]>;
type GetFieldsByTypeFn = (type: string | string[], ignored?: string[]) => Promise<string[]>;
type GetPoliciesFn = () => Promise<string[]>;

interface Callbacks {
  getSources: GetSourceFn;
  getFieldsByType: GetFieldsByTypeFn;
  getPolicies: GetPoliciesFn;
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
    getPolicyMetadata: helpers.getPolicyMetadata,
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
  return (await fn()).reduce((solutions, item) => {
    const distance = levenshtein(item, errorText);
    if (distance < 3) {
      solutions.push(item);
    }
    return solutions;
  }, [] as string[]);
}

async function getSpellingActionForColumns(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  queryString: string,
  { getFieldsByType }: Callbacks
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const possibleFields = await getSpellingPossibilities(() => getFieldsByType('any'), errorText);
  return wrapIntoSpellingChangeAction(error, uri, possibleFields);
}

async function getSpellingActionForIndex(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  queryString: string,
  { getSources }: Callbacks
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const possibleFields = await getSpellingPossibilities(async () => {
    // Handle fuzzy names via truncation to test levenstein distance
    const sources = await getSources();
    if (errorText.endsWith('*')) {
      return sources.map((source) =>
        source.length > errorText.length ? source.substring(0, errorText.length - 1) + '*' : source
      );
    }
    return sources;
  }, errorText);
  return wrapIntoSpellingChangeAction(error, uri, possibleFields);
}

async function getSpellingActionForPolicies(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  queryString: string,
  { getPolicies }: Callbacks
) {
  const errorText = queryString.substring(error.startColumn - 1, error.endColumn - 1);
  const possibleFields = await getSpellingPossibilities(getPolicies, errorText);
  return wrapIntoSpellingChangeAction(error, uri, possibleFields);
}

function wrapIntoSpellingChangeAction(
  error: monaco.editor.IMarkerData,
  uri: monaco.Uri,
  possibleSolution: string[]
): monaco.languages.CodeAction[] {
  return possibleSolution.map((solution) =>
    createAction(
      // @TODO: workout why the tooltip is truncating the title here
      i18n.translate('xpack.data.querying.esql.quickfix.replaceWithSolution', {
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
  if (error.owner === 'esql' && error.message.includes('missing STRING')) {
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
) {
  if (context.markers.length === 0) {
    return [];
  }
  const innerText = model.getValue();
  const { ast } = await astProvider(innerText);

  const queryForFields = buildQueryForFieldsFromSource(innerText, ast);
  const { getFieldsByType } = getFieldsByTypeRetriever(queryForFields, resourceRetriever);
  const getSources = getSourcesRetriever(resourceRetriever);
  const { getPolicies } = getPolicyRetriever(resourceRetriever);

  const callbacks = {
    getFieldsByType,
    getSources,
    getPolicies,
  };

  const actions: monaco.languages.CodeAction[] = [];
  for (const error of context.markers) {
    const code = error.code ?? inferCodeFromError(error);
    switch (code) {
      case 'unknownColumn':
        const columnsSpellChanges = await getSpellingActionForColumns(
          error,
          model.uri,
          innerText,
          callbacks
        );
        actions.push(...columnsSpellChanges);
        break;
      case 'unknownIndex':
        const indexSpellChanges = await getSpellingActionForIndex(
          error,
          model.uri,
          innerText,
          callbacks
        );
        actions.push(...indexSpellChanges);
        break;
      case 'unknownPolicy':
        const policySpellChanges = await getSpellingActionForPolicies(
          error,
          model.uri,
          innerText,
          callbacks
        );
        actions.push(...policySpellChanges);
        break;
      case 'wrongQuotes':
        // it is a syntax error, so location won't be helpful here
        const [, errorText] = error.message.split('at ');
        actions.push(
          createAction(
            i18n.translate('xpack.data.querying.esql.quickfix.replaceWithQuote', {
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

    return actions;
  }
}
