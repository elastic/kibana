/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import type { UseActionProps } from './items/types';
import { useItemsAction } from './items/use_items_action';
import * as i18n from './translations';

export const useTagsAction = ({ onAction, onActionSuccess, isDisabled }: UseActionProps) => {
  const { isFlyoutOpen, onFlyoutClosed, onSaveItems, openFlyout, isActionDisabled } =
    useItemsAction<Alert['tags']>({
      fieldKey: 'tags',
      isDisabled,
      onAction,
      onActionSuccess,
      successToasterTitle: i18n.EDITED_ALERTS,
      fieldSelector: (alert) => alert[ALERT_WORKFLOW_TAGS] as string[],
      itemsTransformer: (items) => items,
    });

  const getAction = (selectedAlerts: Alert[]) => {
    return {
      name: i18n.EDIT_TAGS,
      onClick: () => openFlyout(selectedAlerts),
      disabled: isActionDisabled,
      'data-test-subj': 'alerts-bulk-action-tags',
      icon: <EuiIcon type="tag" size="m" />,
      key: 'alerts-bulk-action-tags',
    };
  };

  return { getAction, isFlyoutOpen, onFlyoutClosed, onSaveTags: onSaveItems };
};

export type UseTagsAction = ReturnType<typeof useTagsAction>;
