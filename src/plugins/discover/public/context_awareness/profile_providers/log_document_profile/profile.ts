/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRegExpPatternFrom } from '@kbn/data-view-utils';
import { DataTableRecord } from '@kbn/discover-utils';
import { DocumentProfileProvider, DocumentType } from '../../profiles';

export const ALLOWED_LOG_DOCUMENT_INDICES = createRegExpPatternFrom([
  'logs',
  'auditbeat',
  'filebeat',
  'winlogbeat',
]);

export const logDocumentProfileProvider: DocumentProfileProvider = {
  profileId: 'log-document-profile',
  profile: {},
  resolve: ({ record }) => {
    const isLogRecord = getIsLogRecord(record);

    if (!isLogRecord) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        type: DocumentType.Log,
      },
    };
  },
};

const getIsLogRecord = (record: DataTableRecord) => {
  return (
    getDataStreamType(record).includes('logs') ||
    hasFieldsWithPrefix('log.')(record) ||
    getIndices(record).some(
      (index) => typeof index === 'string' && ALLOWED_LOG_DOCUMENT_INDICES.test(index)
    )
  );
};

const getFieldValues =
  (field: string) =>
  (record: DataTableRecord): unknown[] => {
    const value = record.flattened[field];
    return Array.isArray(value) ? value : [value];
  };

const getDataStreamType = getFieldValues('data_stream.type');
const getIndices = getFieldValues('_index');

const hasFieldsWithPrefix = (prefix: string) => (record: DataTableRecord) => {
  return Object.keys(record.flattened).some((field) => field.startsWith(prefix));
};
