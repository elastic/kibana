/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
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
import { GROUP_SIMILAR_MESSAGES_FIELD } from './constants';
import { useCanGroupSimilarMessages } from './use_can_group_similar_messages';

export const GroupSimilarMessagesButton = () => {
  const dispatch = useInternalStateDispatch();
  const updateESQLQuery = useCurrentTabAction(internalStateActions.updateESQLQuery);
  const { scopedEBTManager } = useScopedServices();
  const canGroupSimilarMessages = useCanGroupSimilarMessages();

  const onClick = useCallback(() => {
    scopedEBTManager.trackEsqlCategorizeEvent({
      [EsqlCategorizeEventDataKeys.EVENT_NAME]:
        EsqlCategorizeEventName.GROUP_SIMILAR_MESSAGES_CLICKED,
      [EsqlCategorizeEventDataKeys.FIELD_NAME]: GROUP_SIMILAR_MESSAGES_FIELD,
    });
    dispatch(
      updateESQLQuery({
        queryOrUpdater: (esql) => appendCategorizeToESQLQuery(esql, GROUP_SIMILAR_MESSAGES_FIELD),
      })
    );
  }, [dispatch, scopedEBTManager, updateESQLQuery]);

  if (!canGroupSimilarMessages) {
    return null;
  }

  return (
    <EuiButtonEmpty
      size="xs"
      iconType="aggregate"
      onClick={onClick}
      data-test-subj="dscGroupSimilarMessagesButton"
    >
      {i18n.translate('discover.esql.groupSimilarMessages.buttonLabel', {
        defaultMessage: 'Group similar messages',
      })}
    </EuiButtonEmpty>
  );
};
