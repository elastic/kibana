/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useDispatch } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { useGetGroupSelectorStateless } from '@kbn/securitysolution-grouping/src/hooks/use_get_group_selector';
import { updateGroups } from '../store/actions';
import { useDeepEqualSelector, groupIdSelector } from '../store/selectors';
import { useAlertDataView } from '../../..';

export const getUsePersistentControls =
  ({ groupingId, featureIds, dataViews, http, notifications }) =>
  () => {
    const dispatch = useDispatch();
    const onGroupChange = useCallback(
      (selectedGroups: string[]) => {
        // selectedGroups.forEach((g) => trackGroupChange(g));
        dispatch(updateGroups({ activeGroups: selectedGroups, tableId: groupingId }));
      },
      [dispatch]
    );

    const groupId = useMemo(() => groupIdSelector(), []);
    const { options } = useDeepEqualSelector((state) => groupId(state, groupingId)) ?? {
      options: [],
    };

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
      defaultGroupingOptions: options,
      maxGroupingLevels: 3,
    });

    return useMemo(() => {
      return {
        right: groupSelector,
      };
    }, [groupSelector]);
  };
