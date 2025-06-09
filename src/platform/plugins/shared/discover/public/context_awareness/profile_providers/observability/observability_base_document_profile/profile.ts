/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocumentProfileProvider } from '../../../profiles';
import { DocumentType } from '../../../profiles';
import { OBSERVABILITY_DOCUMENT_PROFILE_ID, OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';
import { createGetDocViewer } from './accessors/get_doc_viewer';
import type { ProfileProviderServices } from '../../profile_provider_services';

// export type LogsDataSourceProfileProvider = DataSourceProfileProvider<LogsDataSourceContext>;

export const createObservabilityBaseDocumentProfileProvider = (
  services: ProfileProviderServices
): DocumentProfileProvider => ({
  profileId: OBSERVABILITY_DOCUMENT_PROFILE_ID,
  isExperimental: true,
  profile: {
    getDocViewer: createGetDocViewer(services),
  },
  resolve: ({ record, rootContext }) => {
    console.log('observability base document profile resolved');

    const prefixes = ['attributes.', 'scope.attributes.', 'resource.atributes.'];

    if (rootContext.profileId !== OBSERVABILITY_ROOT_PROFILE_ID) {
      return { isMatch: false };
    }

    if (!hasAnyFieldWithPrefixes(prefixes)(record)) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        type: DocumentType.Default,
      },
    };
  },
});

const hasAnyFieldWithPrefixes = (prefixes: string[]) => {
  return (record: DataTableRecord): boolean => {
    const data = record.flattened;

    for (const prefix of prefixes) {
      for (const key in data) {
        if (key.startsWith(prefix) && data[key] != null) {
          return true;
        }
      }
    }

    return false;
  };
};
