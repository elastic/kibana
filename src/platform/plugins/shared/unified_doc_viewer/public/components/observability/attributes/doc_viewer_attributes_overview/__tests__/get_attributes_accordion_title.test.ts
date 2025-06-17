/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAttributesAccordionTitle } from '../get_attributes_accordion_title';
import { getFieldValue } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils';

jest.mock('@kbn/discover-utils', () => ({
  getFieldValue: jest.fn(),
}));

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
  },
}));

describe('getAttributesAccordionTitle', () => {
  const makeRecord = (type: string[] | undefined, processorEvent?: string | string[]) =>
    ({
      flattened:
        processorEvent !== undefined ? { 'attributes.processor.event': processorEvent } : {},
    } as DataTableRecord);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "Log attributes" for logs', () => {
    (getFieldValue as jest.Mock).mockReturnValue(['logs']);
    expect(getAttributesAccordionTitle(makeRecord(['logs']))).toBe('Log attributes');
  });

  it('returns "Metric attributes" for metrics', () => {
    (getFieldValue as jest.Mock).mockReturnValue(['metrics']);
    expect(getAttributesAccordionTitle(makeRecord(['metrics']))).toBe('Metric attributes');
  });

  it('returns "Transaction attributes" for traces with processor.event transaction', () => {
    (getFieldValue as jest.Mock).mockReturnValue(['traces']);
    expect(getAttributesAccordionTitle(makeRecord(['traces'], ['transaction']))).toBe(
      'Transaction attributes'
    );
  });

  it('returns "Span attributes" for traces with processor.event span', () => {
    (getFieldValue as jest.Mock).mockReturnValue(['traces']);
    expect(getAttributesAccordionTitle(makeRecord(['traces'], ['span']))).toBe('Span attributes');
  });

  it('returns "Span attributes" for traces with processor.event missing', () => {
    (getFieldValue as jest.Mock).mockReturnValue(['traces']);
    expect(getAttributesAccordionTitle(makeRecord(['traces']))).toBe('Span attributes');
  });

  it('returns "Attributes" for unknown type', () => {
    (getFieldValue as jest.Mock).mockReturnValue(['other']);
    expect(getAttributesAccordionTitle(makeRecord(['other']))).toBe('Attributes');
  });

  it('returns "Attributes" for undefined type', () => {
    (getFieldValue as jest.Mock).mockReturnValue(undefined);
    expect(getAttributesAccordionTitle(makeRecord(undefined))).toBe('Attributes');
  });
});
