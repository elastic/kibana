/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataTableRecord, TRACE_ID_FIELD, getFieldValue } from '@kbn/discover-utils';
import { TRACES_PRODUCT_FEATURE_ID } from '../../../../../../common/constants';
import type { DocumentProfileProvider } from '../../../../profiles';
import { DocumentType, SolutionType } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import { createGetDocViewer } from './accessors';

const OBSERVABILITY_GENERIC_DOCUMENT_PROFILE_ID = 'observability-generic-document-profile';

export const createObservabilityGenericDocumentProfileProvider = ({
  apmContextService,
  logsContextService,
}: ProfileProviderServices): DocumentProfileProvider => ({
  profileId: OBSERVABILITY_GENERIC_DOCUMENT_PROFILE_ID,
  restrictedToProductFeature: TRACES_PRODUCT_FEATURE_ID,
  profile: {
    getDocViewer: createGetDocViewer({
      apm: {
        errors: apmContextService.errorsService.getErrorsIndexPattern(),
        traces: apmContextService.tracesService.getAllTracesIndexPattern(),
      },
      logs: logsContextService.getAllLogsIndexPattern(),
    }),
  },
  resolve: ({ record, rootContext }) => {
    const isObservabilitySolutionView = rootContext.solutionType === SolutionType.Observability;

    if (isObservabilitySolutionView && isGenericDocument(record)) {
      return {
        isMatch: true,
        context: {
          type: DocumentType.Generic,
        },
      };
    }

    return { isMatch: false };
  },
});

function isGenericDocument(record: DataTableRecord): boolean {
  const traceId = getFieldValue(record, TRACE_ID_FIELD);

  return !!traceId;
}
