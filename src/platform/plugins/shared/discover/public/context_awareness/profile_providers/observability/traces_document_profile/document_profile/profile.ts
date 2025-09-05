/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataTableRecord, TRACE_ID_FIELD, getFieldValue } from '@kbn/discover-utils';
import type { ContextWithProfileId } from '../../../../profile_service';
import { TRACES_PRODUCT_FEATURE_ID } from '../../../../../../common/constants';
import type { DataSourceContext, DocumentProfileProvider } from '../../../../profiles';
import { DataSourceCategory, DocumentType, SolutionType } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import { createGetDocViewer } from './accessors';

const OBSERVABILITY_TRACES_SPAN_DOCUMENT_PROFILE_ID = 'observability-traces-document-profile';

export const createObservabilityTracesDocumentProfileProvider = ({
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
      logs: logsContextService.getAllLogsIndexPattern(),
    }),
  },
  resolve: ({ record, rootContext, dataSourceContext }) => {
    const isObservabilitySolutionView = rootContext.solutionType === SolutionType.Observability;

    if (isObservabilitySolutionView && isTraceDocument(record, dataSourceContext)) {
      return {
        isMatch: true,
        context: {
          type: DocumentType.Trace,
        },
      };
    }

    return { isMatch: false };
  },
});

function isTraceDocument(
  record: DataTableRecord,
  dataSourceContext: ContextWithProfileId<DataSourceContext>
): boolean {
  const traceId = getFieldValue(record, TRACE_ID_FIELD);

  // TODO: Relying on this data source check is a hack, this should be refactored to use
  // _index field once ES|QL queries return default metadata.
  return dataSourceContext.category === DataSourceCategory.Traces && !!traceId;
}
