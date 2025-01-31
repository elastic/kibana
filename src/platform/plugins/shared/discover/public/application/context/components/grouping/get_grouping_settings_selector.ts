/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useCallback } from 'react';
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useDataGroupingState } from './data_grouping_context';

interface GetPersistentControlsParams {
  groupingId: string;
  maxGroupingLevels?: number;
  dataView: DataView;
}

export const getGroupingSettingsSelectorHook =
  ({ groupingId, dataView, maxGroupingLevels = 3 }: GetPersistentControlsParams) =>
  () => {
    const { grouping, updateGrouping } = useDataGroupingState(groupingId);

    const onGroupChange = useCallback(
      (selectedGroups: string[]) => {
        updateGrouping({
          activeGroups:
            grouping.activeGroups?.filter((g) => g !== 'none').concat(selectedGroups) ?? [],
        });
      },
      [grouping, updateGrouping]
    );

    const groupSelector = useGetGroupSelectorStateless({
      groupingId,
      onGroupChange,
      fields: dataView?.fields ?? [],
      defaultGroupingOptions:
        grouping.options?.filter((option) => !grouping.activeGroups.includes(option.key)) ?? [],
      maxGroupingLevels,
      title: 'Group documents by',
    });

    return useMemo(() => groupSelector, [groupSelector]);
  };
