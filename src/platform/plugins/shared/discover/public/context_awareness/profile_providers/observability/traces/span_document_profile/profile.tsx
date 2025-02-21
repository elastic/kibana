/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DATASTREAM_TYPE_FIELD,
  DataTableRecord,
  getFieldValue,
  PROCESSOR_EVENT_FIELD,
} from '@kbn/discover-utils';
import { DocumentProfileProvider, DocumentType } from '../../../../profiles';
import { ProfileProviderServices } from '../../../profile_provider_services';
import { getDocViewer } from '../../traces_data_source_profile/accessors/get_doc_viewer';

export const createObservabilityTracesSpanDocumentProfileProvider = (
  services: ProfileProviderServices
): DocumentProfileProvider => ({
  profileId: 'obs-traces-span-document-profile',
  profile: {
    getDocViewer,
  },
  resolve: ({ record }) => {
    const isApmEnabled = services.application.capabilities.apm?.show;

    if (!isApmEnabled) {
      return { isMatch: false };
    }

    const isSpanRecord = getIsSpanRecord(record);

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

const getIsSpanRecord = (record: DataTableRecord) => {
  // TODO add condition to check on the document _index against APM configured indexes, currently blocked by https://github.com/elastic/kibana/issues/211414
  return isSpanDocument(record);
};

const isSpanDocument = (record: DataTableRecord) => {
  const dataStreamType = getFieldValue(record, DATASTREAM_TYPE_FIELD);
  const processorEvent = getFieldValue(record, PROCESSOR_EVENT_FIELD);
  // Can I expect other things than a plain string for these fields?
  return dataStreamType === 'traces' && processorEvent === 'span';
};
