/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { DataReferenceCatalog } from './build_data_reference_catalog';
import { toReferenceIconType } from './build_data_reference_catalog';
import type { ReferenceChipTone } from './reference_chip_styles';
import { scanReferenceSpans } from './reference_grammar';
import type { ReferenceForm } from './reference_value';
import { isContainerReference, lookupReferenceTypeLabel } from './reference_value';

/** One `{{ … }}` or `${{ … }}` span found inside a text value. */
export interface ReferenceToken {
  /** Offset of the first delimiter character (the `$` of `${{`). */
  readonly start: number;
  /** Offset just past the closing `}}`. */
  readonly end: number;
  /** Length of the opening delimiter: 2 for `{{`, 3 for `${{`. */
  readonly openLength: number;
  readonly expression: string;
  readonly form: ReferenceForm;
  readonly typeLabel?: string;
  /** `FieldIcon` type: string, number, boolean, array, object, null, date or unknown. */
  readonly iconType: string;
  /** True when the token is the entire value (ignoring surrounding whitespace). */
  readonly isWhole: boolean;
  readonly tone: ReferenceChipTone;
  /** What the user sees on hover: the type and how the reference is written. */
  readonly hover: string;
  /** True when the amber state is the "list or record inside a sentence" case. */
  readonly isContainerInSentence: boolean;
}

export interface FindReferenceTokensOptions {
  readonly catalog?: DataReferenceCatalog;
  /**
   * Flag a known list or record placed inside a sentence. Only meaningful for free text:
   * inside JSON or KQL the surrounding syntax decides what the value becomes.
   */
  readonly warnContainersInSentence?: boolean;
  /**
   * The text is JSON, where a token filling a whole quoted string (`"${{ x }}"`) is the whole
   * value: the quotes are only how a string is written.
   */
  readonly quotedStringsAreValues?: boolean;
}

const OPEN = '{{';
const CLOSE = '}}';

/** What a list or record is called to the user. */
export const containerName = (iconType: string): string =>
  iconType === 'array' ? 'list' : 'record';

const hoverFor = ({
  form,
  typeLabel,
  iconType,
  isContainerInSentence,
  isValueFormInSentence,
}: {
  form: ReferenceForm;
  typeLabel: string;
  iconType: string;
  isContainerInSentence: boolean;
  isValueFormInSentence: boolean;
}): string => {
  if (isContainerInSentence) {
    return i18n.translate('workflows.stepConfigPanel.referenceToken.containerInSentence', {
      defaultMessage:
        "A {type} can't go inside a sentence as it is. Insert it as JSON text to show what's in it.",
      values: { type: containerName(iconType) },
    });
  }
  if (isValueFormInSentence) {
    return i18n.translate('workflows.stepConfigPanel.referenceToken.valueFormInSentence', {
      defaultMessage: 'The value form only works as the whole value.',
    });
  }
  return form === 'value'
    ? i18n.translate('workflows.stepConfigPanel.referenceToken.valueHover', {
        defaultMessage: '{type} · written as a value, so it keeps its type',
        values: { type: typeLabel },
      })
    : i18n.translate('workflows.stepConfigPanel.referenceToken.textHover', {
        defaultMessage: '{type} · written as text',
        values: { type: typeLabel },
      });
};

/**
 * Finds every reference span in `text`, with the type the catalog declares for it and
 * whether it needs attention. Liquid tags (`{% %}`) are not references and are skipped.
 */
export const findReferenceTokens = (
  text: string,
  {
    catalog,
    warnContainersInSentence = false,
    quotedStringsAreValues = false,
  }: FindReferenceTokensOptions = {}
): ReferenceToken[] => {
  const trimmedStart = text.length - text.trimStart().length;
  const trimmedEnd = text.trimEnd().length;
  return scanReferenceSpans(text)
    .filter((span) => span.expression !== '')
    .map(({ start, end, openLength, expression, form }): ReferenceToken => {
      const typeLabel = catalog ? lookupReferenceTypeLabel(catalog, expression) : undefined;
      const iconType = toReferenceIconType(typeLabel ?? 'unknown');
      const fillsQuotedString =
        quotedStringsAreValues && text[start - 1] === '"' && text[end] === '"';
      // The engine reads the value form only as the exact whole value, so padding spoils it; the
      // text form is a string whatever surrounds it, so padding is no matter.
      const isWhole =
        fillsQuotedString ||
        (form === 'value'
          ? start === 0 && end === text.length
          : start <= trimmedStart && end >= trimmedEnd);
      const isContainerInSentence =
        warnContainersInSentence &&
        form === 'text' &&
        !isWhole &&
        isContainerReference(expression, typeLabel);
      const isValueFormInSentence = form === 'value' && !isWhole;
      return {
        start,
        end,
        openLength,
        expression,
        form,
        typeLabel,
        iconType,
        isWhole,
        tone: isContainerInSentence || isValueFormInSentence ? 'warning' : 'neutral',
        hover: hoverFor({
          form,
          typeLabel: typeLabel ?? 'unknown',
          iconType,
          isContainerInSentence,
          isValueFormInSentence,
        }),
        isContainerInSentence,
      };
    });
};

/** Rewrites one token as JSON text (`{{ x | json }}`) so a list or record prints readably. */
export const insertTokenAsJsonText = (text: string, token: ReferenceToken): string =>
  `${text.slice(0, token.start)}${OPEN} ${token.expression} | json ${CLOSE}${text.slice(
    token.end
  )}`;
