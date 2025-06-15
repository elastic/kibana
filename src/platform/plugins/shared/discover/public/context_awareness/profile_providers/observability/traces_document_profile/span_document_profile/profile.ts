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
import type { ProfileProviderServices } from '../../../profile_provider_services';
import { createGetDocViewer } from './accessors';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';

const OBSERVABILITY_TRACES_SPAN_DOCUMENT_PROFILE_ID = 'observability-traces-span-document-profile';

export const createObservabilityTracesSpanDocumentProfileProvider = ({
  tracesContextService,
}: ProfileProviderServices): DocumentProfileProvider => ({
  isExperimental: true,
  profileId: OBSERVABILITY_TRACES_SPAN_DOCUMENT_PROFILE_ID,
  profile: {
    getDocViewer: createGetDocViewer(tracesContextService.getAllTracesIndexPattern()),
  },
  resolve: ({ record, rootContext }) => {
    const isObservabilitySolutionView = rootContext.profileId === OBSERVABILITY_ROOT_PROFILE_ID;

    if (!isObservabilitySolutionView) {
      return { isMatch: false };
    }

    const isSpanRecord = getIsSpanRecord({
      record,
    });

    if (!isSpanRecord) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        type: DocumentType.Span,
      },
    };
  },
});

const getIsSpanRecord = ({ record }: { record: DataTableRecord }) => {
  return isSpanDocument(record);
};

const isSpanDocument = (record: DataTableRecord) => {
  const dataStreamType = getFieldValue(record, DATASTREAM_TYPE_FIELD);
  const processorEvent = getFieldValue(record, PROCESSOR_EVENT_FIELD);
  return dataStreamType === 'traces' && processorEvent === 'span';
};
