/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker, parse, type ESQLAstItem, TIME_SYSTEM_PARAMS } from '@kbn/esql-ast';
import {
  ESQLAstQueryExpression,
  ESQLFunction,
  ESQLSingleAstItem,
  ESQLSource,
  isESQLNamedParamLiteral,
} from '@kbn/esql-ast/src/types';
import type { ESQLFieldWithMetadata } from '@kbn/esql-ast/src/commands_registry/types';
import {
  getFunctionSignatures,
  getFunctionDefinition,
  getValidSignaturesAndTypesToSuggestNext,
} from '@kbn/esql-ast/src/definitions/utils';
import { collectUserDefinedColumns, type ESQLCallbacks } from '@kbn/esql-validation-autocomplete';
import { getFieldsByTypeRetriever } from '@kbn/esql-validation-autocomplete/src/autocomplete/autocomplete';
import {
  modeDescription,
  ENRICH_MODES,
} from '@kbn/esql-ast/src/commands_registry/commands/enrich/util';
import { getQueryForFields } from '@kbn/esql-validation-autocomplete/src/autocomplete/helper';
import { within } from '@kbn/esql-validation-autocomplete/src/shared/helpers';
import { getPolicyHelper } from '@kbn/esql-validation-autocomplete/src/shared/resources_helpers';
import { i18n } from '@kbn/i18n';
import { monaco } from '../../../../monaco_imports';
import { monacoPositionToOffset } from '../shared/utils';
import { getVariablesHoverContent } from './helpers';

const ACCEPTABLE_TYPES_HOVER = i18n.translate('monaco.esql.hover.acceptableTypes', {
  defaultMessage: 'Acceptable types',
});

const TIME_SYSTEM_DESCRIPTIONS = {
  '?_tstart': i18n.translate('monaco.esql.autocomplete.timeSystemParamStart', {
    defaultMessage: 'The start time from the date picker',
  }),
  '?_tend': i18n.translate('monaco.esql.autocomplete.timeSystemParamEnd', {
    defaultMessage: 'The end time from the date picker',
  }),
};

export type HoverMonacoModel = Pick<monaco.editor.ITextModel, 'getValue'>;

/**
 * @todo Monaco dependencies are not necesasry here: (1) replace {@link HoverMonacoModel}
 * by some generic `getText(): string` method; (2) replace {@link monaco.Position} by
 * `offset: number`.
 */
export async function getHoverItem(
  model: HoverMonacoModel,
  position: monaco.Position,
  callbacks?: ESQLCallbacks
) {
  const fullText = model.getValue();
  const offset = monacoPositionToOffset(fullText, position);

  const { root } = parse(fullText);

  let containingFunction: ESQLFunction<'variadic-call'> | undefined;
  let node: ESQLSingleAstItem | undefined;
  Walker.walk(root, {
    visitFunction: (fn) => {
      if (within(offset, fn.location)) node = fn;

      if (fn.subtype === 'variadic-call') {
        const parentheses = {
          left: fullText.indexOf('(', fn.location.min),
          right: fn.location.max,
        };
        if (parentheses.left < offset && parentheses.right > offset)
          containingFunction = fn as ESQLFunction<'variadic-call'>;
      }
    },
    visitSource: (source, parent, walker) => {
      if (within(offset, source.location)) {
        node = source;
        walker.abort();
      }
    },
    visitSingleAstItem: (_node) => {
      // ignore identifiers because we don't want to choose them as the node type
      // instead of the function node (functions can have an "operator" child which is
      // usually an identifer representing the name of the function)
      if (_node.type !== 'identifier' && within(offset, _node.location)) {
        node = _node;
      }
    },
  });

  const hoverContent: monaco.languages.Hover = {
    contents: [],
  };

  if (!node) {
    return hoverContent;
  }

  const variables = callbacks?.getVariables?.();
  const variablesContent = getVariablesHoverContent(node, variables);

  if (variablesContent.length) {
    hoverContent.contents.push(...variablesContent);
  }

  if (containingFunction) {
    const argHints = await getHintForFunctionArg(
      containingFunction,
      root,
      fullText,
      offset,
      callbacks
    );
    hoverContent.contents.push(...argHints);
  }

  if (node.type === 'function') {
    const fnDefinition = getFunctionDefinition(node.name);

    if (fnDefinition) {
      hoverContent.contents.push(
        ...[
          { value: getFunctionSignatures(fnDefinition)[0].declaration },
          { value: fnDefinition.description },
        ]
      );
    }
  }

  if (node.type === 'source' && node.sourceType === 'policy') {
    const source = node as ESQLSource;
    const { getPolicyMetadata } = getPolicyHelper(callbacks);
    const policyMetadata = await getPolicyMetadata(node.name);
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

    if (!!source.prefix) {
      const mode = ENRICH_MODES.find(
        ({ name }) => '_' + name === source.prefix!.valueUnquoted.toLowerCase()
      )!;
      if (mode) {
        hoverContent.contents.push(
          ...[
            { value: modeDescription },
            {
              value: `**${mode.name}**: ${mode.description}`,
            },
          ]
        );
      }
    }
  }

  return hoverContent;
}

async function getHintForFunctionArg(
  fnNode: ESQLFunction,
  root: ESQLAstQueryExpression,
  query: string,
  offset: number,
  resourceRetriever?: ESQLCallbacks
) {
  const queryForFields = getQueryForFields(query, root);
  const { getFieldsMap } = getFieldsByTypeRetriever(queryForFields, resourceRetriever);

  const fnDefinition = getFunctionDefinition(fnNode.name);
  // early exit on no hit
  if (!fnDefinition) {
    return [];
  }
  const fieldsMap: Map<string, ESQLFieldWithMetadata> = await getFieldsMap();
  const anyUserDefinedColumns = collectUserDefinedColumns(root.commands, fieldsMap, query);

  const references = {
    fields: fieldsMap,
    userDefinedColumns: anyUserDefinedColumns,
  };

  const { typesToSuggestNext, enrichedArgs } = getValidSignaturesAndTypesToSuggestNext(
    fnNode,
    references,
    fnDefinition,
    query,
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

  return contents;
}
