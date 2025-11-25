/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import type { ItemsSelectionState, UseActionProps } from './items/types';
import * as i18n from './translations';
import { useBulkUpdateAlertTags } from '../../hooks/use_bulk_update_alert_tags';
import { useAlertsTableContext } from '../../contexts/alerts_table_context';

export interface AlertIdentifier {
  _id: string;
  _index: string;
}

export const useTagsAction = ({
  onAction,
  onActionSuccess,
  onActionError,
  isDisabled,
}: UseActionProps) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const onFlyoutClosed = useCallback(() => setIsFlyoutOpen(false), []);
  const [selectedAlertsToEdit, setSelectedAlertsToEdit] = useState<AlertIdentifier[]>([]);
  const {
    services: { http, notifications },
  } = useAlertsTableContext();

  const { mutateAsync: bulkUpdateAlertTags } = useBulkUpdateAlertTags({ http, notifications });

  const openFlyout = useCallback(
    (selectedAlerts: AlertIdentifier[]) => {
      onAction();
      setIsFlyoutOpen(true);
      setSelectedAlertsToEdit(selectedAlerts);
    },
    [onAction]
  );

  const onSaveItems = useCallback(
    async (tagsSelection: ItemsSelectionState) => {
      const alertsByIndex = selectedAlertsToEdit.reduce((acc, alert) => {
        if (!acc[alert._index]) {
          acc[alert._index] = [];
        }
        acc[alert._index].push(alert);
        return acc;
      }, {} as Record<string, AlertIdentifier[]>);

      try {
        await Promise.all(
          Object.entries(alertsByIndex).map(([index, alerts]) =>
            bulkUpdateAlertTags({
              index,
              alertIds: alerts.map((alert) => alert._id),
              add: tagsSelection.selectedItems?.length ? tagsSelection.selectedItems : undefined,
              remove: tagsSelection.unSelectedItems?.length
                ? tagsSelection.unSelectedItems
                : undefined,
            })
          )
        );
        onFlyoutClosed();
        onActionSuccess();
      } catch {
        onActionError();
      }
    },
    [bulkUpdateAlertTags, onFlyoutClosed, onActionSuccess, onActionError, selectedAlertsToEdit]
  );

  const getAction = (selectedAlerts: AlertIdentifier[]) => {
    return {
      name: i18n.EDIT_TAGS,
      onClick: () => openFlyout(selectedAlerts),
      disabled: isDisabled,
      'data-test-subj': 'alerts-bulk-action-tags',
      icon: <EuiIcon type="tag" size="m" />,
      key: 'alerts-bulk-action-tags',
    };
  };

  return { getAction, isFlyoutOpen, onFlyoutClosed, onSaveTags: onSaveItems };
};

export type UseTagsAction = ReturnType<typeof useTagsAction>;
