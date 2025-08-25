/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import {
  getFieldValue,
  PROCESSOR_EVENT_FIELD,
  SPAN_ID_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import { TRACES_PRODUCT_FEATURE_ID } from '../../../../../../common/constants';
import type { DataSourceContext, DocumentProfileProvider } from '../../../../profiles';
import { DocumentType, SolutionType } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import type { ContextWithProfileId } from '../../../../profile_service';
import { createGetDocViewer } from './accessors';

const OBSERVABILITY_TRACES_SPAN_DOCUMENT_PROFILE_ID = 'observability-traces-span-document-profile';

export const createObservabilityTracesSpanDocumentProfileProvider = ({
  tracesContextService,
  apmErrorsContextService,
  logsContextService,
}: ProfileProviderServices): DocumentProfileProvider => ({
  profileId: OBSERVABILITY_TRACES_SPAN_DOCUMENT_PROFILE_ID,
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

    return resolveSpanRecord({
      record,
      dataSourceContext,
    });
  },
});

const resolveSpanRecord = ({
  record,
  dataSourceContext,
}: {
  record: DataTableRecord;
  dataSourceContext: ContextWithProfileId<DataSourceContext>;
}) => {
  const isMatchingRecord = dataSourceContext.category === 'traces' && isSpanDocument(record);

  return isMatchingRecord
    ? ({
        isMatch: true,
        context: {
          type: DocumentType.Span,
        },
      } as const)
    : ({ isMatch: false } as const);
};

const isSpanDocument = (record: DataTableRecord) => {
  const processorEvent = getFieldValue(record, PROCESSOR_EVENT_FIELD);
  const transactionName = getFieldValue(record, TRANSACTION_NAME_FIELD);
  const spanId = getFieldValue(record, SPAN_ID_FIELD);

  const isApmSpan = processorEvent === 'span';
  const isOtelSpan = processorEvent == null;

  return !transactionName && (isApmSpan || isOtelSpan || !!spanId);
};
