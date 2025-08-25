/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue, PROCESSOR_EVENT_FIELD, TRANSACTION_NAME_FIELD } from '@kbn/discover-utils';
import { TRACES_PRODUCT_FEATURE_ID } from '../../../../../../common/constants';
import type { DataSourceContext, DocumentProfileProvider } from '../../../../profiles';
import { DocumentType, SolutionType } from '../../../../profiles';
import { createGetDocViewer } from './accessors';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import type { ContextWithProfileId } from '../../../../profile_service';

const OBSERVABILITY_TRACES_TRANSACTION_DOCUMENT_PROFILE_ID =
  'observability-traces-transaction-document-profile';

export const createObservabilityTracesTransactionDocumentProfileProvider = ({
  tracesContextService,
  apmErrorsContextService,
  logsContextService,
}: ProfileProviderServices): DocumentProfileProvider => ({
  profileId: OBSERVABILITY_TRACES_TRANSACTION_DOCUMENT_PROFILE_ID,
  restrictedToProductFeature: TRACES_PRODUCT_FEATURE_ID,
  profile: {
    getDocViewer: createGetDocViewer({
      apm: {
        errors: apmErrorsContextService.getErrorsIndexPattern(),
        traces: tracesContextService.getAllTracesIndexPattern(),
      },
      logs: logsContextService.getAllLogsIndexPattern() ?? '',
    }),
  },
  resolve: ({ record, rootContext, dataSourceContext }) => {
    const isObservabilitySolutionView = rootContext.solutionType === SolutionType.Observability;

    if (!isObservabilitySolutionView) {
      return { isMatch: false };
    }

    return resolveTransactionRecord({
      record,
      dataSourceContext,
    });
  },
});

const resolveTransactionRecord = ({
  record,
  dataSourceContext,
}: {
  record: DataTableRecord;
  dataSourceContext: ContextWithProfileId<DataSourceContext>;
}) => {
  const isMatchingRecord = dataSourceContext.category === 'traces' && isTransactionDocument(record);

  return isMatchingRecord
    ? ({
        isMatch: true,
        context: {
          type: DocumentType.Transaction,
        },
      } as const)
    : ({ isMatch: false } as const);
};

const isTransactionDocument = (record: DataTableRecord) => {
  const processorEvent = getFieldValue(record, PROCESSOR_EVENT_FIELD);
  const transactionName = getFieldValue(record, TRANSACTION_NAME_FIELD);

  return processorEvent === 'transaction' || !!transactionName;
};
