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
import { buildQueryUntilPreviousCommand, getFieldsByTypeHelper } from '../shared/resources_helpers';
import { ESQLCallbacks } from '../shared/types';
import { AstProviderFn } from '../types';

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

export async function getActions(
  model: monaco.editor.ITextModel,
  range: monaco.Range,
  context: monaco.languages.CodeActionContext,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
) {
  const innerText = model.getValue();
  const { ast } = await astProvider(innerText);

  const queryForFields = buildQueryUntilPreviousCommand(ast, innerText);
  const { getFieldsByType } = getFieldsByTypeRetriever(queryForFields, resourceRetriever);

  const actions: monaco.languages.CodeAction[] = [];
  for (const error of context.markers) {
    if (!error.message.includes('Unknown column')) {
      continue;
    }
    const wrongField = innerText.substring(error.startColumn - 1, error.endColumn - 1);

    const possibleFields = (await getFieldsByType('any')).reduce((solutions, field) => {
      const distance = levenshtein(field, wrongField);
      if (distance < 3) {
        solutions.push(field);
      }
      return solutions;
    }, [] as string[]);

    actions.push(
      ...possibleFields.map((solution) => ({
        title: i18n.translate('xpack.data.querying.esql.quickfix.replaceWithField', {
          defaultMessage: 'Change spelling to {field}',
          values: {
            field: solution,
          },
        }),
        diagnostics: [error],
        kind: 'quickfix',
        edit: {
          edits: [
            {
              resource: model.uri,
              textEdit: {
                range: error,
                text: solution,
              },
              versionId: undefined,
            },
          ],
        },
        isPreferred: true,
      }))
    );
    return actions;
  }
}
