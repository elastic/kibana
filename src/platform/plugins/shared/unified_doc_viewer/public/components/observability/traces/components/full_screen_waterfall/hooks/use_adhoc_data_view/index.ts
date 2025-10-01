/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

const errorMessage = i18n.translate(
  'unifiedDocViewer.observability.traces.fullScreenWaterfall.logFlyout.error',
  {
    defaultMessage: 'An error occurred while creating the data view',
  }
);

export const useAdhocDataView = ({ index }: { index: string | null }) => {
  const { data, core } = getUnifiedDocViewerServices();
  const [dataView, setDataView] = useState<DataView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function createAdhocDataView() {
      if (!index) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const _dataView = await data.dataViews.create(
          { title: index, timeFieldName: '@timestamp' },
          undefined,
          false
        );
        setDataView(_dataView);
      } catch (e) {
        setError(errorMessage);
        const err = e as Error;
        core.notifications.toasts.addDanger({
          title: errorMessage,
          text: err.message,
        });
      } finally {
        setLoading(false);
      }
    }
    createAdhocDataView();
  }, [index, data.dataViews, core.notifications.toasts]);
  return { dataView, error, loading };
};
