/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { useMemo, useRef } from 'react';
import { lastValueFrom } from 'rxjs';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import { WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID } from '@kbn/workflows/common/constants';
import { WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE } from '../../../common';
import { getExecutedByLabel, useUserProfilesByUid } from '../../entities/user_profiles';
import { useKibana } from '../../hooks/use_kibana';

const MAX_EXECUTED_BY_VALUES = 100;
const EXECUTED_BY_AGG_NAME = 'executedByValues';
const STATIC_LOOKUP_FORMAT_ID = 'static_lookup';

const getHiddenExecutorLabel = (position?: number): string =>
  position === undefined
    ? i18n.translate('workflows.executionsPage.filterExecutedBy.hidden', {
        defaultMessage: 'Unknown user',
      })
    : i18n.translate('workflows.executionsPage.filterExecutedBy.hiddenNumbered', {
        defaultMessage: 'Unknown user {position}',
        values: { position },
      });

interface ExecutedByAggregationResponse {
  aggregations?: {
    [EXECUTED_BY_AGG_NAME]?: { buckets?: Array<{ key: string }> };
  };
}

export interface ExecutedByFieldFormats {
  fieldFormats: Record<string, SerializedFieldFormat>;
  isReady: boolean;
}

/**
 * Builds the data view field format that renders `executedBy` profile UIDs as user display names
 * in the options list control, while the UID remains the filter value.
 */
export const useExecutedByFieldFormats = ({
  spaceId,
}: {
  spaceId?: string;
}): ExecutedByFieldFormats => {
  const { cloud, data } = useKibana().services;
  const showExecutor = useUiSetting<boolean>(WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID, true);
  const showUnresolvedExecutors = !cloud?.isServerlessEnabled;

  const { data: uids, isFetching: isFetchingUids } = useQuery<string[]>(
    ['workflows', 'executions', 'executedByValues', spaceId],
    async () => {
      const response = await lastValueFrom(
        data.search.search<{ params: Record<string, unknown> }, { rawResponse: unknown }>({
          params: {
            index: WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE,
            size: 0,
            query: { term: { spaceId } },
            aggs: {
              [EXECUTED_BY_AGG_NAME]: {
                terms: { field: 'executedBy', size: MAX_EXECUTED_BY_VALUES },
              },
            },
          },
        })
      );
      const { aggregations } = response.rawResponse as ExecutedByAggregationResponse;
      return (aggregations?.[EXECUTED_BY_AGG_NAME]?.buckets ?? []).map(({ key }) => key);
    },
    { enabled: Boolean(spaceId), refetchOnWindowFocus: false, retry: false }
  );

  const hasUids = (uids?.length ?? 0) > 0;
  const { data: profiles, isFetching: isFetchingProfiles } = useUserProfilesByUid({
    enabled: showExecutor,
    uids: uids ?? [],
  });

  const nextFieldFormats = useMemo(() => {
    const exposeRawValues = showExecutor && showUnresolvedExecutors;
    const lookupEntries = (uids ?? []).map((uid, index) => ({
      key: uid,
      value:
        (showExecutor
          ? getExecutedByLabel(profiles?.get(uid), showUnresolvedExecutors ? uid : undefined)
          : undefined) ?? getHiddenExecutorLabel(index + 1),
    }));

    return {
      executedBy: {
        id: STATIC_LOOKUP_FORMAT_ID,
        // Values outside the lookup must not leak the profile UID when raw values are hidden.
        params: {
          lookupEntries,
          unknownKeyValue: exposeRawValues ? null : getHiddenExecutorLabel(),
        },
      },
    };
  }, [profiles, showExecutor, showUnresolvedExecutors, uids]);

  // Keep the data view spec identity stable unless the formats actually change.
  const stableFieldFormatsRef = useRef(nextFieldFormats);
  if (!isEqual(stableFieldFormatsRef.current, nextFieldFormats)) {
    stableFieldFormatsRef.current = nextFieldFormats;
  }

  return {
    fieldFormats: stableFieldFormatsRef.current,
    // A disabled query without data reports `isLoading`, so only wait for queries that are fetching.
    isReady: !isFetchingUids && !(showExecutor && hasUids && isFetchingProfiles),
  };
};
