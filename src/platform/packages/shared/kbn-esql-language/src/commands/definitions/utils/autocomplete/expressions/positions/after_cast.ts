/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { SupportedDataType } from '../../../../..';
import type { ESQLInlineCast } from '../../../../../../types';
import { Walker, within } from '../../../../../../ast';
import type { ISuggestionItem } from '../../../../../registry/types';
import { getFunctionDefinition } from '../../../functions';
import type { ExpressionContext } from '../types';
import { getExpressionType } from '../../..';
import { inlineCastsMapping } from '../../../../generated/inline_casts_mapping';
import { getMatchingSignatures } from '../../../expressions';
import { SuggestionCategory } from '../../../../../../shared';

/**
 * Suggests completions after the cast (::) keyword.
 * We suggest only casting types that can be applied to the value being casted, and
 * only those types that are expected for the containing expression.
 */
export async function suggestAfterCast(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  // If there is not expression root, suggest all casting types as we don't have enough information for filtering.
  if (!ctx.expressionRoot) {
    return getCastingTypesSuggestions();
  }

  // Find the inline cast node that contains the cursor position
  // This let us handle cases where there are multiple casts in the expression
  let inlineCastNode: ESQLInlineCast | undefined;
  Walker.walk(ctx.expressionRoot, {
    visitInlineCast(node) {
      if (within(ctx.cursorPosition, node)) {
        inlineCastNode = node;
      }
    },
  });

  // Get the type of the value being casted
  const sourceType = inlineCastNode
    ? getExpressionType(inlineCastNode.value, ctx.context?.columns)
    : undefined;

  return getCastingTypesSuggestions(sourceType);
}

/**
 * Returns suggestions for inline casts.
 * If sourceType is provided, only returns casting types that can be applied to it.
 */
export function getCastingTypesSuggestions(sourceType?: SupportedDataType): ISuggestionItem[] {
  let validCastingTypes: string[] = [];

  if (sourceType) {
    Object.entries(inlineCastsMapping).forEach(([castingType, fnName]) => {
      const castFunctionDef = getFunctionDefinition(fnName);
      if (!castFunctionDef) {
        return;
      }

      // Don't suggest casting types that are equal to the source type, (don't suggest true::boolean)
      if (sourceType === castFunctionDef.signatures[0].returnType) {
        return;
      }

      // Only suggest casting types that can accept the source type
      const matchingSignatures = getMatchingSignatures(
        castFunctionDef.signatures,
        [sourceType],
        [false],
        true // accepts unknown
      );
      if (matchingSignatures.length > 0) {
        validCastingTypes.push(castingType);
      }
    });
  } else {
    validCastingTypes = Object.keys(inlineCastsMapping);
  }

  return validCastingTypes.map((castingType) => {
    const suggestion: ISuggestionItem = {
      label: castingType,
      text: castingType,
      kind: 'Text',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.inlineCastingTypeDescription', {
        defaultMessage: `Cast value to ${castingType}`,
        values: { castingType },
      }),
      category: SuggestionCategory.OPERATOR,
    };
    return suggestion;
  });
}
