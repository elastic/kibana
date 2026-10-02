/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  esqlConversionFailureReasonMessages,
  esqlConversionFailureTitle,
  getFailureTooltip,
  getFailureTooltipPlainText,
} from './to_esql_failure_reasons';

describe('getFailureTooltip', () => {
  it('returns the full message and no title for non-Top-values reasons', () => {
    expect(getFailureTooltip(['formula_not_supported'])).toEqual({
      messages: [esqlConversionFailureReasonMessages.formula_not_supported],
    });
  });

  it('returns title plus sentence for a Top values reason', () => {
    expect(getFailureTooltip(['terms_other_bucket_not_supported'])).toEqual({
      title: esqlConversionFailureTitle,
      messages: [esqlConversionFailureReasonMessages.terms_other_bucket_not_supported],
    });
  });

  it('returns only the first reason unless showAllReasons is set', () => {
    expect(
      getFailureTooltip(['terms_other_bucket_not_supported', 'terms_accuracy_mode_not_supported'])
    ).toEqual({
      title: esqlConversionFailureTitle,
      messages: [esqlConversionFailureReasonMessages.terms_other_bucket_not_supported],
    });
  });

  it('returns every Top values reason when showAllReasons is true', () => {
    expect(
      getFailureTooltip(
        ['terms_other_bucket_not_supported', 'terms_accuracy_mode_not_supported'],
        { showAllReasons: true }
      )
    ).toEqual({
      title: esqlConversionFailureTitle,
      messages: [
        esqlConversionFailureReasonMessages.terms_other_bucket_not_supported,
        esqlConversionFailureReasonMessages.terms_accuracy_mode_not_supported,
      ],
    });
  });

  it('falls back to unknown when reasons are missing', () => {
    expect(getFailureTooltip(undefined)).toEqual({
      messages: [esqlConversionFailureReasonMessages.unknown],
    });
  });
});

describe('getFailureTooltipPlainText', () => {
  it('joins title and a single Top values message', () => {
    expect(getFailureTooltipPlainText(['terms_other_bucket_not_supported'])).toBe(
      `${esqlConversionFailureTitle}: ${esqlConversionFailureReasonMessages.terms_other_bucket_not_supported}`
    );
  });

  it('returns the legacy full string for non-Top-values reasons', () => {
    expect(getFailureTooltipPlainText(['formula_not_supported'])).toBe(
      esqlConversionFailureReasonMessages.formula_not_supported
    );
  });
});
