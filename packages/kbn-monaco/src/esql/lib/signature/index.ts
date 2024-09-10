/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AstProviderFn } from '@kbn/esql-ast';
import {
  correctQuerySyntax,
  getFunctionDefinition,
} from '@kbn/esql-validation-autocomplete/src/shared/helpers';
import {
  ESQLCallbacks,
  ESQLRealField,
  collectVariables,
  getAstContext,
} from '@kbn/esql-validation-autocomplete';
import { isESQLFunction } from '@kbn/esql-ast/src/types';
import {
  getQueryForFields,
  getValidSignaturesAndTypesToSuggestNext,
} from '@kbn/esql-validation-autocomplete/src/autocomplete/helper';
import { buildQueryUntilPreviousCommand } from '@kbn/esql-validation-autocomplete/src/shared/resources_helpers';
import { getFieldsByTypeRetriever } from '@kbn/esql-validation-autocomplete/src/autocomplete/autocomplete';
import { TIME_SYSTEM_PARAMS } from '@kbn/esql-validation-autocomplete/src/autocomplete/factories';
import { monacoPositionToOffset } from '../shared/utils';
import type { monaco } from '../../../monaco_imports';

const DISPOSE = () => {};
const EMPTY_SIGNATURE = {
  value: { signatures: [], activeParameter: 0, activeSignature: 0 },
  dispose: DISPOSE,
};

export async function getSignatureHelp(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.SignatureHelpContext,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
): Promise<monaco.languages.SignatureHelpResult> {
  const fullText = model.getValue();
  const offset = monacoPositionToOffset(fullText, position);
  const innerText = fullText.substring(0, offset);
  const correctedQuery = correctQuerySyntax(innerText, context);
  const { ast } = await astProvider(correctedQuery);
  const astContext = getAstContext(innerText, ast, offset);

  const { node } = astContext;
  const commands = ast;

  if (isESQLFunction(node) && astContext.type === 'function') {
    const queryForFields = getQueryForFields(
      buildQueryUntilPreviousCommand(ast, correctedQuery),
      ast
    );
    const { getFieldsMap } = getFieldsByTypeRetriever(queryForFields, resourceRetriever);

    const fnDefinition = getFunctionDefinition(node.name);
    // early exit on no hit
    if (!fnDefinition) {
      return EMPTY_SIGNATURE;
    }
    const fieldsMap: Map<string, ESQLRealField> = await getFieldsMap();
    const anyVariables = collectVariables(commands, fieldsMap, innerText);

    const references = {
      fields: fieldsMap,
      variables: anyVariables,
    };

    const { typesToSuggestNext, enrichedArgs } = getValidSignaturesAndTypesToSuggestNext(
      node,
      references,
      fnDefinition,
      fullText,
      offset
    );

    const activeParameter = enrichedArgs.length - 1;
    if (typesToSuggestNext.length > 0) {
      const hint: monaco.languages.SignatureInformation = {
        activeParameter: 0,
        label: `${typesToSuggestNext
          .map(
            ({ type, constantOnly }) =>
              `${constantOnly ? 'constant ' : ''}${type}` +
              // If function arg is a constant date, helpfully suggest named time system params
              (constantOnly && type === 'date' ? ` | ${TIME_SYSTEM_PARAMS.join(' | ')}` : '')
          )
          .join(' | ')}`,
        parameters: [],
      };

      return {
        value: {
          signatures: [hint],
          activeParameter,
          activeSignature: 0,
        },
        dispose: DISPOSE,
      };
    }
  }

  return EMPTY_SIGNATURE;
}
