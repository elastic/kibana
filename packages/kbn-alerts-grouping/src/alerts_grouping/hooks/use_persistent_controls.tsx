/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo } from 'react';
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useAlertDataView } from '@kbn/alerts-ui-shared';
import { useAlertsGroupingState } from '../contexts/alerts_grouping_context';
import { AlertsGroupingProps } from '../types';

interface GetUsePersistentControlsParams {
  groupingId: string;
  featureIds: AlertConsumers[];
  maxGroupingLevels?: number;
  services: Pick<AlertsGroupingProps['services'], 'dataViews' | 'http' | 'notifications'>;
}

export const getDefaultPersistentControls =
  ({
    groupingId,
    featureIds,
    maxGroupingLevels = 3,
    services: { dataViews, http, notifications },
  }: GetUsePersistentControlsParams) =>
  () => {
    const { grouping, updateGrouping } = useAlertsGroupingState(groupingId);

    const onGroupChange = useCallback(
      (selectedGroups: string[]) => {
        updateGrouping({ activeGroups: selectedGroups });
      },
      [updateGrouping]
    );

    const { dataViews: alertDataViews } = useAlertDataView({
      featureIds,
      dataViewsService: dataViews,
      http,
      toasts: notifications.toasts,
    });

    const dataView = useMemo(() => alertDataViews?.[0], [alertDataViews]);

    const groupSelector = useGetGroupSelectorStateless({
      groupingId,
      onGroupChange,
      fields: dataView?.fields ?? [],
      defaultGroupingOptions: grouping.options,
      maxGroupingLevels,
    });

    return useMemo(() => {
      return {
        right: groupSelector,
      };
    }, [groupSelector]);
  };
