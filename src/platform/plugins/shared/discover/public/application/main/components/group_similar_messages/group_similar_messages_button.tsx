/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getCategorizationField } from '@kbn/aiops-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { hasAggregatingCommand } from '@kbn/esql-utils';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import { useScopedServices } from '../../../../components/scoped_services_provider/scoped_services_provider';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useCurrentTabDataStateContainer,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { groupSimilarMessages } from './group_similar_messages_query';

export const GroupSimilarMessagesButton = () => {
  const dispatch = useInternalStateDispatch();
  const updateESQLQuery = useCurrentTabAction(internalStateActions.updateESQLQuery);
  const { scopedEBTManager } = useScopedServices();
  const { licensing } = useDiscoverServices();
  const license = useObservable(licensing?.license$ ?? EMPTY);
  const query = useAppStateSelector((state) => state.query);
  const { data$ } = useCurrentTabDataStateContainer();
  const { dataSource, fetchStatus } = useDataState(data$.documents$);

  if (
    !license?.isActive ||
    !license.hasAtLeast('platinum') ||
    fetchStatus !== FetchStatus.COMPLETE ||
    !isOfAggregateQueryType(query) ||
    dataSource?.kind !== 'esql' ||
    dataSource.query !== query.esql.trim() ||
    hasAggregatingCommand(query.esql)
  ) {
    return null;
  }

  const field = getCategorizationField(
    dataSource.resultColumns
      .filter(({ meta }) => meta.esType === 'text' || meta.esType === 'match_only_text')
      .map(({ name }) => name)
  );
  if (!field) {
    return null;
  }

  const label = i18n.translate('discover.esql.groupSimilarMessages.buttonLabel', {
    defaultMessage: 'Find patterns in {field}',
    values: { field },
  });

  return (
    <EuiToolTip
      content={i18n.translate('discover.esql.groupSimilarMessages.tooltip', {
        defaultMessage: 'Group {field} by pattern to spot trends and anomalies.',
        values: { field },
      })}
    >
      <EuiBadge
        color="primary"
        iconType="bulb"
        onClick={() => {
          scopedEBTManager.trackGroupSimilarMessagesClick();
          dispatch(
            updateESQLQuery({ queryOrUpdater: (esql) => groupSimilarMessages(esql, field) })
          );
        }}
        onClickAriaLabel={label}
        title=""
        data-test-subj="dscGroupSimilarMessagesButton"
      >
        {label}
      </EuiBadge>
    </EuiToolTip>
  );
};
