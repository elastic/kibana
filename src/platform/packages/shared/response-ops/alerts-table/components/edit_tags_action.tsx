/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { typedMemo } from '../utils/react';
import { EditTagsFlyout } from './tags/edit_tags_flyout';
import type { ItemsSelectionState } from './tags/items/types';
import { useBulkUpdateAlertTags } from '../hooks/use_bulk_update_alert_tags';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

export const EditTagsAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    refresh,
    onActionExecuted,
  }: AlertActionsProps<AC>) => {
    const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
    const {
      services: { http, notifications },
    } = useAlertsTableContext();

    const handleOpenFlyout = useCallback(() => {
      setIsFlyoutVisible(true);
    }, []);

    const handleCloseFlyout = useCallback(() => {
      setIsFlyoutVisible(false);
    }, []);

    const onActionSuccess = useCallback(() => {
      handleCloseFlyout();
      onActionExecuted?.();
      refresh();
    }, [handleCloseFlyout, onActionExecuted, refresh]);

    const onActionError = useCallback(() => {
      refresh();
    }, [refresh]);

    const { mutateAsync: updateAlertTags } = useBulkUpdateAlertTags({
      http,
      notifications,
      onSuccess: onActionSuccess,
      onError: onActionError,
    });

    const handleSaveTags = useCallback(
      async (tagsSelection: ItemsSelectionState) => {
        await updateAlertTags({
          index: alert._index,
          alertIds: [alert._id],
          add: tagsSelection.selectedItems?.length ? tagsSelection.selectedItems : undefined,
          remove: tagsSelection.unSelectedItems?.length ? tagsSelection.unSelectedItems : undefined,
        });
      },
      [alert, updateAlertTags]
    );

    return (
      <>
        <EuiContextMenuItem
          data-test-subj="editTags"
          key="editTags"
          size="s"
          onClick={handleOpenFlyout}
        >
          {i18n.translate('xpack.responseOpsAlertsTable.actions.editTags', {
            defaultMessage: 'Edit tags',
          })}
        </EuiContextMenuItem>
        {isFlyoutVisible && (
          <EditTagsFlyout
            selectedAlerts={[alert]}
            onClose={handleCloseFlyout}
            onSaveTags={handleSaveTags}
          />
        )}
      </>
    );
  }
);
