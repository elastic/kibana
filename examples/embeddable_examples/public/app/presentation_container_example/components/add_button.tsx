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

    uiActions.getTriggerCompatibleActions(ADD_PANEL_TRIGGER, actionContext).then((actions) => {
      if (cancelled) return;

      const nextItems = actions.map((action) => {
        return (
          <EuiContextMenuItem
            key={action.id}
            icon={action?.getIconType(actionContext) ?? ''}
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
