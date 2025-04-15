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
import type { DocumentProfileProvider } from '../../../../profiles';
import { DocumentType } from '../../../../profiles';
import { createGetDocViewer } from './accessors';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';
import type { ProfileProviderServices } from '../../../profile_provider_services';

const OBSERVABILITY_TRACES_TRANSACTION_DOCUMENT_PROFILE_ID =
  'observability-traces-transaction-document-profile';

export const createObservabilityTracesTransactionDocumentProfileProvider = ({
  tracesContextService,
}: ProfileProviderServices): DocumentProfileProvider => ({
  isExperimental: true,
  profileId: OBSERVABILITY_TRACES_TRANSACTION_DOCUMENT_PROFILE_ID,
  profile: {
    getDocViewer: createGetDocViewer(tracesContextService.getAllTracesIndexPattern() || ''),
  },
  resolve: ({ record, rootContext }) => {
    const isObservabilitySolutionView = rootContext.profileId === OBSERVABILITY_ROOT_PROFILE_ID;

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
