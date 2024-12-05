/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { AstProviderFn, ESQLAstItem } from '@kbn/esql-ast';
import {
  getAstContext,
  getFunctionDefinition,
  getFunctionSignatures,
  isSourceItem,
  isSettingItem,
  getCommandDefinition,
  type ESQLCallbacks,
  getPolicyHelper,
  collectVariables,
  ESQLRealField,
} from '@kbn/esql-validation-autocomplete';
import { correctQuerySyntax } from '@kbn/esql-validation-autocomplete/src/shared/helpers';
import type { EditorContext } from '@kbn/esql-validation-autocomplete/src/autocomplete/types';
import {
  getQueryForFields,
  getValidSignaturesAndTypesToSuggestNext,
} from '@kbn/esql-validation-autocomplete/src/autocomplete/helper';
import { buildQueryUntilPreviousCommand } from '@kbn/esql-validation-autocomplete/src/shared/resources_helpers';
import { getFieldsByTypeRetriever } from '@kbn/esql-validation-autocomplete/src/autocomplete/autocomplete';
import {
  TIME_SYSTEM_DESCRIPTIONS,
  TIME_SYSTEM_PARAMS,
} from '@kbn/esql-validation-autocomplete/src/autocomplete/factories';
import { isESQLFunction, isESQLNamedParamLiteral } from '@kbn/esql-ast/src/types';
import { monacoPositionToOffset } from '../shared/utils';
import { monaco } from '../../../monaco_imports';

const ACCEPTABLE_TYPES_HOVER = i18n.translate('monaco.esql.hover.acceptableTypes', {
  defaultMessage: 'Acceptable types',
});

async function getHoverItemForFunction(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
) {
  const context: EditorContext = {
    triggerCharacter: ' ',
    triggerKind: 1,
  };

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
      return undefined;
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

    const hoveredArg: ESQLAstItem & {
      dataType: string;
    } = enrichedArgs[enrichedArgs.length - 1];
    const contents = [];
    if (hoveredArg && isESQLNamedParamLiteral(hoveredArg)) {
      const bestMatch = TIME_SYSTEM_PARAMS.find((p) => p.startsWith(hoveredArg.text));
      // We only know if it's start or end after first 3 characters (?t_s or ?t_e)
      if (hoveredArg.text.length > 3 && bestMatch) {
        Object.entries(TIME_SYSTEM_DESCRIPTIONS).forEach(([key, value]) => {
          contents.push({
            value: `**${key}**: ${value}`,
          });
        });
      }
    }

    if (typesToSuggestNext.length > 0) {
      contents.push({
        value: `**${ACCEPTABLE_TYPES_HOVER}**: ${typesToSuggestNext
          .map(
            ({ type, constantOnly }) =>
              `${constantOnly ? '_constant_ ' : ''}**${type}**` +
              // If function arg is a constant date, helpfully suggest named time system params
              (constantOnly && type === 'date' ? ` | ${TIME_SYSTEM_PARAMS.join(' | ')}` : '')
          )
          .join(' | ')}`,
      });
    }
    const hints =
      contents.length > 0
        ? {
            range: new monaco.Range(
              1,
              1,
              model.getLineCount(),
              model.getLineMaxColumn(model.getLineCount())
            ),
            contents,
          }
        : undefined;
    return hints;
  }
}

export async function getHoverItem(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
) {
  const fullText = model.getValue();
  const offset = monacoPositionToOffset(fullText, position);

  const { ast } = await astProvider(fullText);
  const astContext = getAstContext(fullText, ast, offset);

  const { getPolicyMetadata } = getPolicyHelper(resourceRetriever);

  let hoverContent: monaco.languages.Hover = {
    contents: [],
  };
  const hoverItemsForFunction = await getHoverItemForFunction(
    model,
    position,
    token,
    astProvider,
    resourceRetriever
  );
  if (hoverItemsForFunction) {
    hoverContent = hoverItemsForFunction;
  }

  if (['newCommand', 'list'].includes(astContext.type)) {
    return { contents: [] };
  }

  if (astContext.type === 'function') {
    const fnDefinition = getFunctionDefinition(astContext.node.name);

    if (fnDefinition) {
      hoverContent.contents.push(
        ...[
          { value: getFunctionSignatures(fnDefinition)[0].declaration },
          { value: fnDefinition.description },
        ]
      );
    }
  }

  if (astContext.type === 'expression') {
    if (astContext.node) {
      if (isSourceItem(astContext.node) && astContext.node.sourceType === 'policy') {
        const policyMetadata = await getPolicyMetadata(astContext.node.name);
        if (policyMetadata) {
          hoverContent.contents.push(
            ...[
              {
                value: `${i18n.translate('monaco.esql.hover.policyIndexes', {
                  defaultMessage: '**Indexes**',
                })}: ${policyMetadata.sourceIndices.join(', ')}`,
              },
              {
                value: `${i18n.translate('monaco.esql.hover.policyMatchingField', {
                  defaultMessage: '**Matching field**',
                })}: ${policyMetadata.matchField}`,
              },
              {
                value: `${i18n.translate('monaco.esql.hover.policyEnrichedFields', {
                  defaultMessage: '**Fields**',
                })}: ${policyMetadata.enrichFields.join(', ')}`,
              },
            ]
          );
        }
      }
      if (isSettingItem(astContext.node)) {
        const commandDef = getCommandDefinition(astContext.command.name);
        const settingDef = commandDef?.modes.find(({ values }) =>
          values.some(({ name }) => name === astContext.node!.name)
        );
        if (settingDef) {
          const mode = settingDef.values.find(({ name }) => name === astContext.node!.name)!;
          hoverContent.contents.push(
            ...[
              { value: settingDef.description },
              {
                value: `**${mode.name}**: ${mode.description}`,
              },
            ]
          );
        }
      }
    }
  }
  return hoverContent;
}
