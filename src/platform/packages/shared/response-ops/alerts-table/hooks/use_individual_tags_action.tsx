/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import type { Alert } from '@kbn/alerting-types';
import type { ItemsSelectionState } from '../components/tags/items/types';
import { useBulkUpdateAlertTags } from './use_bulk_update_alert_tags';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

export interface IndividualTagsActionState {
  isFlyoutOpen: boolean;
  selectedAlert: Alert | null;
  openFlyout: (alert: Alert) => void;
  onClose: () => void;
  onSaveTags: (tagsSelection: ItemsSelectionState) => Promise<void>;
}

export const useIndividualTagsAction = (): IndividualTagsActionState => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const {
    services: { http, notifications },
    refresh,
  } = useAlertsTableContext();

  const { mutateAsync: bulkUpdateAlertTags } = useBulkUpdateAlertTags({ http, notifications });

  const openFlyout = useCallback((alert: Alert) => {
    setSelectedAlert(alert);
    setIsFlyoutOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setIsFlyoutOpen(false);
    setSelectedAlert(null);
  }, []);

  const onSaveTags = useCallback(
    async (tagsSelection: ItemsSelectionState) => {
      if (!selectedAlert) return;

      try {
        await bulkUpdateAlertTags({
          index: selectedAlert._index,
          alertIds: [selectedAlert._id],
          add: tagsSelection.selectedItems?.length ? tagsSelection.selectedItems : undefined,
          remove: tagsSelection.unSelectedItems?.length ? tagsSelection.unSelectedItems : undefined,
        });
        onClose();
        refresh();
      } catch {
        // Error handling is done by the hook
        refresh();
      }
    },
    [bulkUpdateAlertTags, onClose, refresh, selectedAlert]
  );

  return {
    isFlyoutOpen,
    selectedAlert,
    openFlyout,
    onClose,
    onSaveTags,
  };
};
