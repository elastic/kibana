/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { TIME_SYSTEM_PARAMS, Walker, parse, within, type ESQLAstItem } from '@kbn/esql-ast';
import {
  ENRICH_MODES,
  modeDescription,
} from '@kbn/esql-ast/src/commands_registry/commands/enrich/util';
import {
  getFunctionDefinition,
  getFunctionSignatures,
  getValidSignaturesAndTypesToSuggestNext,
} from '@kbn/esql-ast/src/definitions/utils';
import {
  isESQLNamedParamLiteral,
  type ESQLAstQueryExpression,
  type ESQLFunction,
  type ESQLSingleAstItem,
  type ESQLSource,
} from '@kbn/esql-ast/src/types';
import type { ESQLCallbacks } from '../shared/types';
import { getColumnsByTypeRetriever } from '../autocomplete/autocomplete';
import { getPolicyHelper } from '../shared/resources_helpers';
import { getVariablesHoverContent } from './helpers';

interface HoverContent {
  contents: Array<{ value: string }>;
}

const ACCEPTABLE_TYPES_HOVER = i18n.translate(
  'kbn-esql-validation-autocomplete.esql.hover.acceptableTypes',
  {
    defaultMessage: 'Acceptable types',
  }
);

const TIME_SYSTEM_DESCRIPTIONS = {
  '?_tstart': i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.timeSystemParamStart',
    {
      defaultMessage: 'The start time from the date picker',
    }
  ),
  '?_tend': i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.timeSystemParamEnd',
    {
      defaultMessage: 'The end time from the date picker',
    }
  ),
};

export async function getHoverItem(fullText: string, offset: number, callbacks?: ESQLCallbacks) {
  const { root } = parse(fullText);

  let containingFunction: ESQLFunction<'variadic-call'> | undefined;
  let node: ESQLSingleAstItem | undefined;
  Walker.walk(root, {
    visitFunction: (fn) => {
      if (within(offset, fn)) node = fn;

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
      if (within(offset, source)) {
        node = source;
        walker.abort();
      }
    },
    visitSingleAstItem: (_node) => {
      // ignore identifiers because we don't want to choose them as the node type
      // instead of the function node (functions can have an "operator" child which is
      // usually an identifer representing the name of the function)
      if (_node.type !== 'identifier' && within(offset, _node)) {
        node = _node;
      }
    },
  });

  const hoverContent: HoverContent = {
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
            value: `${i18n.translate('kbn-esql-validation-autocomplete.esql.hover.policyIndexes', {
              defaultMessage: '**Indexes**',
            })}: ${policyMetadata.sourceIndices.join(', ')}`,
          },
          {
            value: `${i18n.translate(
              'kbn-esql-validation-autocomplete.esql.hover.policyMatchingField',
              {
                defaultMessage: '**Matching field**',
              }
            )}: ${policyMetadata.matchField}`,
          },
          {
            value: `${i18n.translate(
              'kbn-esql-validation-autocomplete.esql.hover.policyEnrichedFields',
              {
                defaultMessage: '**Fields**',
              }
            )}: ${policyMetadata.enrichFields.join(', ')}`,
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
  const { getColumnMap } = getColumnsByTypeRetriever(root, query, resourceRetriever);

  const fnDefinition = getFunctionDefinition(fnNode.name);
  // early exit on no hit
  if (!fnDefinition) {
    return [];
  }
  const columnsMap = await getColumnMap();

  const references = {
    columns: columnsMap,
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
