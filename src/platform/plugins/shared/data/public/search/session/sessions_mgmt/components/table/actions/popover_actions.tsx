/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import type {
  EuiContextMenuPanelItemDescriptorEntry,
  EuiContextMenuPanelItemSeparator,
} from '@elastic/eui/src/components/context_menu/context_menu';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import React, { useState } from 'react';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import type { UISession } from '../../../types';
import { ACTION } from '../../../types';
import { getAction } from './get_action';
import type { OnActionComplete } from './types';

interface PopoverActionItemsProps {
  session: UISession;
  api: SearchSessionsMgmtAPI;
  onActionComplete: OnActionComplete;
  core: CoreStart;
  allowedActions?: UISession['actions'];
}

export const PopoverActionsMenu = ({
  api,
  onActionComplete,
  session,
  core,
  allowedActions,
}: PopoverActionItemsProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const onPopoverClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const renderPopoverButton = () => (
    <EuiToolTip
      content={i18n.translate('data.mgmt.searchSessions.actions.tooltip.moreActions', {
        defaultMessage: 'More actions',
      })}
    >
      <EuiButtonIcon
        aria-label={i18n.translate('data.mgmt.searchSessions.ariaLabel.moreActions', {
          defaultMessage: 'More actions',
        })}
        color="text"
        iconType="boxesHorizontal"
        onClick={onPopoverClick}
      />
    </EuiToolTip>
  );

  const actions =
    session.actions?.filter((action) => {
      if (!allowedActions) return true;
      return allowedActions.includes(action);
    }) || [];
  // Generic set of actions - up to the API to return what is available
  const items = actions.reduce((itemSet, actionType) => {
    const actionDef = getAction(api, actionType, session, core);
    if (actionDef) {
      const { label, iconType, onClick } = actionDef;

      // add a line above the delete action (when there are multiple)
      // NOTE: Delete action MUST be the final action[] item
      if (actions.length > 1 && actionType === ACTION.DELETE) {
        itemSet.push({ isSeparator: true, key: 'separadorable' });
      }

      return [
        ...itemSet,
        {
          key: `action-${actionType}`,
          name: label,
          icon: iconType,
          'data-test-subj': `sessionManagementPopoverAction-${actionType}`,
          onClick: async () => {
            closePopover();
            await onClick();
            onActionComplete();
          },
        } as EuiContextMenuPanelItemDescriptorEntry,
      ];
    }
    return itemSet;
  }, [] as Array<EuiContextMenuPanelItemDescriptorEntry | EuiContextMenuPanelItemSeparator>);

  const panels: EuiContextMenuPanelDescriptor[] = [{ id: 0, items }];

  return actions.length ? (
    <EuiPopover
      id={`popover-${session.id}`}
      button={renderPopoverButton()}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize={'s'}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  ) : null;
};
