/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataSource } from '@kbn/data-source';
import type { SUGGEST_AD_JOBS_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UnifiedHistogramServices } from '../../../types';

// Avoid taking a dependency on uiActionsPlugin just for this const
const suggestAdJobsTrigger: typeof SUGGEST_AD_JOBS_TRIGGER = 'SUGGEST_AD_JOBS_TRIGGER';

/**
 * Returns a callback which opens the anomaly detection job suggestions for the data view,
 * or undefined when the data source can't be analyzed or nothing handles the trigger.
 */
export const useSuggestAdJobs = ({
  services,
  dataSource,
}: {
  services: UnifiedHistogramServices;
  dataSource: DataSource | undefined;
}) => {
  const [isCompatible, setIsCompatible] = useState(false);

  // Primitives, so a new data source object for the same data view doesn't restart the check
  const { indexPattern, dataViewId } = useMemo(() => {
    if (dataSource?.kind !== 'index-pattern') {
      return {};
    }
    const dataView = dataSource.getDataView();
    return dataView.isTimeBased()
      ? { indexPattern: dataView.getIndexPattern(), dataViewId: dataView.id }
      : {};
  }, [dataSource]);

  const triggerContext = useMemo(
    () => (indexPattern ? { indexPattern, dataViewId } : undefined),
    [indexPattern, dataViewId]
  );

  useEffect(() => {
    let isCurrent = true;
    setIsCompatible(false);
    if (!triggerContext) {
      return;
    }
    services.uiActions
      .getTriggerCompatibleActions(suggestAdJobsTrigger, triggerContext)
      .then((actions) => {
        if (isCurrent && actions.length > 0) {
          setIsCompatible(true);
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [services.uiActions, triggerContext]);

  const onSuggestAdJobs = useCallback(() => {
    if (!triggerContext) {
      return;
    }
    void services.uiActions.executeTriggerActions(suggestAdJobsTrigger, triggerContext);
  }, [services.uiActions, triggerContext]);

  return isCompatible ? onSuggestAdJobs : undefined;
};
