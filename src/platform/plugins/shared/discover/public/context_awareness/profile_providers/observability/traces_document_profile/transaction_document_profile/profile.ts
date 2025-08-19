/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { DATASTREAM_TYPE_FIELD, getFieldValue, PROCESSOR_EVENT_FIELD } from '@kbn/discover-utils';
import { TRACES_PRODUCT_FEATURE_ID } from '../../../../../../common/constants';
import type { DocumentProfileProvider } from '../../../../profiles';
import { DocumentType, SolutionType } from '../../../../profiles';
import { createGetDocViewer } from './accessors';
import type { ProfileProviderServices } from '../../../profile_provider_services';

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
  resolve: ({ record, rootContext }) => {
    const isObservabilitySolutionView = rootContext.solutionType === SolutionType.Observability;

    if (!isObservabilitySolutionView) {
      return { isMatch: false };
    }

    const isTransactionRecord = getIsTransactionRecord({
      record,
    });

    if (!isTransactionRecord) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        type: DocumentType.Transaction,
      },
    };
  },
});

const getIsTransactionRecord = ({ record }: { record: DataTableRecord }) => {
  return isTransactionDocument(record);
};

const isTransactionDocument = (record: DataTableRecord) => {
  const dataStreamType = getFieldValue(record, DATASTREAM_TYPE_FIELD);
  const processorEvent = getFieldValue(record, PROCESSOR_EVENT_FIELD);
  return dataStreamType === 'traces' && processorEvent === 'transaction';
};
