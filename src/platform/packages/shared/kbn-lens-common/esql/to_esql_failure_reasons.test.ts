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
  getFailureTooltipText,
} from './to_esql_failure_reasons';

describe('getFailureTooltip', () => {
  it('returns the shared title plus reason body', () => {
    expect(getFailureTooltip('formula_not_supported')).toEqual({
      title: esqlConversionFailureTitle,
      message: esqlConversionFailureReasonMessages.formula_not_supported,
    });
  });

  it('returns title plus sentence for a Top values reason', () => {
    expect(getFailureTooltip('terms_other_bucket_not_supported')).toEqual({
      title: esqlConversionFailureTitle,
      message: esqlConversionFailureReasonMessages.terms_other_bucket_not_supported,
    });
  });

  it('falls back to unknown when reason is missing', () => {
    expect(getFailureTooltip(undefined)).toEqual({
      title: esqlConversionFailureTitle,
      message: esqlConversionFailureReasonMessages.unknown,
    });
  });
});

describe('getFailureTooltipText', () => {
  it('joins title and reason into a single translated string', () => {
    expect(getFailureTooltipText('formula_not_supported')).toBe(
      `${esqlConversionFailureTitle}: ${esqlConversionFailureReasonMessages.formula_not_supported}`
    );
  });

  it('falls back to unknown when reason is missing', () => {
    expect(getFailureTooltipText(undefined)).toBe(
      `${esqlConversionFailureTitle}: ${esqlConversionFailureReasonMessages.unknown}`
    );
  });
});
