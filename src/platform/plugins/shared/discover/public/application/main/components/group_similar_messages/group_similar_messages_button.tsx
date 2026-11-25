/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { appendCategorizeToESQLQuery } from '@kbn/esql-utils';
import { useScopedServices } from '../../../../components/scoped_services_provider/scoped_services_provider';
import {
  EsqlCategorizeEventDataKeys,
  EsqlCategorizeEventName,
} from '../../../../ebt_manager/esql_categorize_event_definition';
import {
  internalStateActions,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { useGroupSimilarMessagesField } from './use_group_similar_messages_field';

export const GroupSimilarMessagesButton = () => {
  const dispatch = useInternalStateDispatch();
  const updateESQLQuery = useCurrentTabAction(internalStateActions.updateESQLQuery);
  const { scopedEBTManager } = useScopedServices();
  const groupByField = useGroupSimilarMessagesField();

  const onClick = useCallback(() => {
    if (!groupByField) {
      return;
    }

    scopedEBTManager.trackEsqlCategorizeEvent({
      [EsqlCategorizeEventDataKeys.EVENT_NAME]:
        EsqlCategorizeEventName.GROUP_SIMILAR_MESSAGES_CLICKED,
      [EsqlCategorizeEventDataKeys.FIELD_NAME]: groupByField,
    });
    dispatch(
      updateESQLQuery({
        queryOrUpdater: (esql) => appendCategorizeToESQLQuery(esql, groupByField),
      })
    );
  }, [dispatch, groupByField, scopedEBTManager, updateESQLQuery]);

  if (!groupByField) {
    return null;
  }

  const label = i18n.translate('discover.esql.groupSimilarMessages.buttonLabel', {
    defaultMessage: 'Find patterns in {field}',
    values: { field: groupByField },
  });

  return (
    <EuiToolTip
      content={i18n.translate('discover.esql.groupSimilarMessages.tooltip', {
        defaultMessage: 'Group the messages in {field} by pattern to spot trends and anomalies.',
        values: { field: groupByField },
      })}
    >
      <EuiBadge
        color="primary"
        iconType="bulb"
        onClick={onClick}
        onClickAriaLabel={label}
        data-test-subj="dscGroupSimilarMessagesButton"
      >
        {label}
      </EuiBadge>
    </EuiToolTip>
  );
};
