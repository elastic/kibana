/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { unflattenObject } from '@kbn/object-utils';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

interface UseFetchLogParams {
  id: string;
  index?: string;
}

export function useFetchLog({ id, index }: UseFetchLogParams) {
  const { discoverShared, core } = getUnifiedDocViewerServices();

  const fetchLogDocumentByIdFeature = discoverShared.features.registry.getById(
    'observability-logs-fetch-document-by-id'
  );

  const { loading, error, value } = useAbortableAsync(
    async ({ signal }) => {
      if (!fetchLogDocumentByIdFeature?.fetchLogDocumentById || !id) {
        return undefined;
      }

      return fetchLogDocumentByIdFeature.fetchLogDocumentById(
        {
          id,
          ...(index ? { index } : {}),
        },
        signal
      );
    },
    [fetchLogDocumentByIdFeature, id, index]
  );

  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.notifications.toasts.addDanger({
        title: i18n.translate('unifiedDocViewer.fullScreenWaterfall.logDocument.error', {
          defaultMessage: 'An error occurred while fetching the log document',
        }),
        text: errorMessage,
      });
    }
  }, [error, core.notifications.toasts]);

  return {
    loading,
    log: value?.fields ? unflattenObject(value.fields) : undefined,
    index: value?._index,
  };
}
