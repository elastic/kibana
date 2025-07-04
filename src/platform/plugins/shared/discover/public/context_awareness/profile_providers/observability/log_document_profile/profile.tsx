/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { BehaviorSubject } from 'rxjs';
import type { DocumentProfileProvider } from '../../../profiles';
import { DocumentType, SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { createGetDocViewer } from './accessors';
import type { LogOverviewContext } from '../logs_data_source_profile/profile';
import { isLogsDataSourceContext } from '../logs_data_source_profile/profile';

export type LogDocumentProfileProvider = DocumentProfileProvider<{
  logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>;
}>;

export const createObservabilityLogDocumentProfileProvider = (
  services: ProfileProviderServices
): LogDocumentProfileProvider => ({
  profileId: 'observability-log-document-profile',
  profile: {
    getDocViewer: createGetDocViewer(services),
  },
  resolve: ({ record, rootContext, dataSourceContext }) => {
    if (rootContext.solutionType !== SolutionType.Observability) {
      return { isMatch: false };
    }

    const isLogRecord = getIsLogRecord(record, services.logsContextService.isLogsIndexPattern);

    if (!isLogRecord) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        type: DocumentType.Log,
        logOverviewContext$: isLogsDataSourceContext(dataSourceContext)
          ? dataSourceContext.logOverviewContext$
          : new BehaviorSubject<LogOverviewContext | undefined>(undefined),
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
