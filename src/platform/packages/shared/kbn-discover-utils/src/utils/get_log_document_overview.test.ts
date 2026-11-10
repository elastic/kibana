/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { dataViewMock } from '../__mocks__';
import type { DataTableRecord } from '../types';
import { getLogDocumentOverview } from './get_log_document_overview';
import { getLogLevelFieldWithFallback } from './get_log_level_field_with_fallback';
import { getMessageFieldWithFallbacks } from './get_message_field_with_fallbacks';

const buildRecord = (flattened: Record<string, unknown>): DataTableRecord => ({
  id: '1',
  raw: {},
  flattened,
});

describe('getLogDocumentOverview', () => {
  describe('OTel document in an ES|QL page mixed with ECS documents', () => {
    // ES|QL rows keep columns that are null for this row but set for others on the page.
    const overview = getLogDocumentOverview(
      buildRecord({
        '@timestamp': '2026-10-13T15:00:00.000Z',
        'log.level': null,
        message: null,
        severity_text: ['ERROR'],
        'body.text': 'OTel request failed',
      }),
      { dataView: dataViewMock, fieldFormats: fieldFormatsMock }
    );

    it('returns severity_text', () => {
      expect(overview.severity_text).toBe('ERROR');
    });

    it('resolves the log level from severity_text', () => {
      expect(getLogLevelFieldWithFallback(overview)).toEqual({
        field: 'severity_text',
        value: 'ERROR',
      });
    });

    it('resolves the message from body.text', () => {
      expect(getMessageFieldWithFallbacks(overview)).toMatchObject({
        field: 'body.text',
        value: 'OTel request failed',
      });
    });
  });
});
