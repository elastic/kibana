/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { AstProviderFn } from '@kbn/esql-ast';
import {
  getAstContext,
  getFunctionDefinition,
  getFunctionSignatures,
  isSourceItem,
  isSettingItem,
  getCommandDefinition,
  type ESQLCallbacks,
  getPolicyHelper,
} from '@kbn/esql-validation-autocomplete';
import type { monaco } from '../../../monaco_imports';
import { monacoPositionToOffset } from '../shared/utils';

export async function getHoverItem(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
) {
  const innerText = model.getValue();
  const offset = monacoPositionToOffset(innerText, position);

  const { ast } = await astProvider(innerText);
  const astContext = getAstContext(innerText, ast, offset);
  const { getPolicyMetadata } = getPolicyHelper(resourceRetriever);

  if (['newCommand', 'list'].includes(astContext.type)) {
    return { contents: [] };
  }

  if (astContext.type === 'function') {
    const fnDefinition = getFunctionDefinition(astContext.node.name);

    if (fnDefinition) {
      return {
        contents: [
          { value: getFunctionSignatures(fnDefinition)[0].declaration },
          { value: fnDefinition.description },
        ],
      };
    }
  }

  if (astContext.type === 'expression') {
    if (astContext.node) {
      if (isSourceItem(astContext.node) && astContext.node.sourceType === 'policy') {
        const policyMetadata = await getPolicyMetadata(astContext.node.name);
        if (policyMetadata) {
          return {
            contents: [
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
            ],
          };
        }
      }
      if (isSettingItem(astContext.node)) {
        const commandDef = getCommandDefinition(astContext.command.name);
        const settingDef = commandDef?.modes.find(({ values }) =>
          values.some(({ name }) => name === astContext.node!.name)
        );
        if (settingDef) {
          const mode = settingDef.values.find(({ name }) => name === astContext.node!.name)!;
          return {
            contents: [
              { value: settingDef.description },
              {
                value: `**${mode.name}**: ${mode.description}`,
              },
            ],
          };
        }
      }
    }
  }

  return { contents: [] };
}
