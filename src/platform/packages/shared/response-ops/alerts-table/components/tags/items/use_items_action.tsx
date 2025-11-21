/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import { difference, isEqual } from 'lodash';
import type { Alert } from '@kbn/alerting-types';
import type { UseActionProps, ItemsSelectionState } from './types';

type AlertsUpdateRequest = Record<string, unknown>;

type UseItemsActionProps<T> = UseActionProps & {
  fieldKey: 'tags' | 'assignees';
  successToasterTitle: (totalAlerts: number) => string;
  fieldSelector: (alert: Alert) => string[];
  itemsTransformer: (items: string[]) => T;
};

export const useItemsAction = <T,>({
  isDisabled,
  fieldKey,
  onAction,
  onActionSuccess,
  successToasterTitle,
  fieldSelector,
  itemsTransformer,
}: UseItemsActionProps<T>) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [selectedAlertsToEdit, setSelectedAlertsToEdit] = useState<Alert[]>([]);
  const isActionDisabled = isDisabled;

  const onFlyoutClosed = useCallback(() => setIsFlyoutOpen(false), []);
  const openFlyout = useCallback(
    (selectedAlerts: Alert[]) => {
      onAction();
      setIsFlyoutOpen(true);
      setSelectedAlertsToEdit(selectedAlerts);
    },
    [onAction]
  );

  const areItemsEqual = (originalItems: Set<string>, itemsToUpdate: Set<string>): boolean => {
    return isEqual(originalItems, itemsToUpdate);
  };

  const updateAlerts = useCallback(
    (payload: AlertsUpdateRequest, options: { onSuccess: () => void }) => {
      // TODO: Implement logic to update alerts
    },
    []
  );

  const onSaveItems = useCallback(
    (itemsSelection: ItemsSelectionState) => {
      onAction();
      onFlyoutClosed();

      const alertsToUpdate = selectedAlertsToEdit.reduce((acc, alert) => {
        const alertFieldValue = fieldSelector(alert);

        if (!alertFieldValue) return acc;

        const itemsWithoutUnselectedItems = difference(
          alertFieldValue,
          itemsSelection.unSelectedItems
        );

        const uniqueItems = new Set([
          ...itemsWithoutUnselectedItems,
          ...itemsSelection.selectedItems,
        ]);

        if (areItemsEqual(new Set([...alertFieldValue]), uniqueItems)) {
          return acc;
        }

        return [
          ...acc,
          {
            [fieldKey]: itemsTransformer(Array.from(uniqueItems.values())),
            id: alert.id,
            version: alert.version,
          },
        ];
      }, [] as AlertsUpdateRequest[]);

      const payload = {
        Alerts: alertsToUpdate,
        successToasterTitle: successToasterTitle(selectedAlertsToEdit.length),
      };

      updateAlerts(payload, { onSuccess: onActionSuccess });
    },
    [
      fieldKey,
      fieldSelector,
      itemsTransformer,
      onAction,
      onActionSuccess,
      onFlyoutClosed,
      selectedAlertsToEdit,
      successToasterTitle,
      updateAlerts,
    ]
  );

  return { isFlyoutOpen, onFlyoutClosed, onSaveItems, openFlyout, isActionDisabled };
};

export type UseItemsAction = ReturnType<typeof useItemsAction>;
