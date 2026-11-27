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
import type { DISCOVER_AD_MANAGEMENT_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UnifiedHistogramServices } from '../../../types';
import { useAdIndexPattern } from './use_ad_index_pattern';

// Avoid taking a dependency on uiActionsPlugin just for this const
const discoverAdManagementTrigger: typeof DISCOVER_AD_MANAGEMENT_TRIGGER =
  'DISCOVER_AD_MANAGEMENT_TRIGGER';

/**
 * Returns a callback which opens the anomaly detection job suggestions for the data view,
 * or undefined when the data source (a data view or an ES|QL query) has no time field to analyze or nothing handles the trigger.
 */
export const useDiscoverAdManagement = ({
  services,
  dataSource,
}: {
  services: UnifiedHistogramServices;
  dataSource: DataSource | undefined;
}) => {
  const [isCompatible, setIsCompatible] = useState(false);

  const { indexPattern, dataViewId } = useAdIndexPattern(dataSource);

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
      .getTriggerCompatibleActions(discoverAdManagementTrigger, triggerContext)
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
    void services.uiActions.executeTriggerActions(discoverAdManagementTrigger, triggerContext);
  }, [services.uiActions, triggerContext]);

  return isCompatible ? onSuggestAdJobs : undefined;
};
