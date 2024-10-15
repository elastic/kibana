/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { DocumentProfileProvider, DocumentType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { getDocViewer } from './accessors';

export const createLogDocumentProfileProvider = (
  services: ProfileProviderServices
): DocumentProfileProvider => ({
  profileId: 'log-document-profile',
  profile: {
    getDocViewer,
  },
  resolve: ({ record }) => {
    const isLogRecord = getIsLogRecord(record, services.logsContextService.isLogsIndexPattern);

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
});

const getIsLogRecord = (
  record: DataTableRecord,
  isLogsIndexPattern: ProfileProviderServices['logsContextService']['isLogsIndexPattern']
) => {
  return (
    getDataStreamType(record).includes('logs') ||
    hasFieldsWithPrefix('log.')(record) ||
    getIndices(record).some(isLogsIndexPattern)
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
  return Object.keys(record.flattened).some(
    (field) => field.startsWith(prefix) && record.flattened[field] != null
  );
};
