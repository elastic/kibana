/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement, useEffect, useState } from 'react';
import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { ADD_PANEL_TRIGGER, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { PageApi } from '../types';

export function AddButton({ pageApi, uiActions }: { pageApi: unknown; uiActions: UiActionsStart }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [items, setItems] = useState<ReactElement[]>([]);

  useEffect(() => {
    let cancelled = false;

    const actionContext = {
      embeddable: pageApi,
      trigger: {
        id: ADD_PANEL_TRIGGER,
      },
    };
    const actionsPromises = uiActions.getTriggerActions(ADD_PANEL_TRIGGER).map(async (action) => {
      return {
        isCompatible: await action.isCompatible(actionContext),
        action,
      };
    });

    Promise.all(actionsPromises).then((actions) => {
      if (cancelled) {
        return;
      }

      const nextItems = actions
        .filter(
          ({ action, isCompatible }) => isCompatible && action.id !== 'ACTION_CREATE_ESQL_CHART'
        )
        .map(({ action }) => {
          return (
            <EuiContextMenuItem
              key={action.id}
              icon="share"
              onClick={() => {
                action.execute(actionContext);
                setIsPopoverOpen(false);
              }}
            >
              {action.getDisplayName(actionContext)}
            </EuiContextMenuItem>
          );
        });
      setItems(nextItems);
    });

    return () => {
      cancelled = true;
    };
  }, [pageApi, uiActions]);

  return (
    <EuiPopover
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        >
          Add panel
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
      }}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
}
