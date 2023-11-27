/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
} from '@elastic/eui';

import { getEditPanelAction } from '@kbn/presentation-panel-plugin/public';
import { FiltersNotificationPopoverContents } from './filters_notification_popover_contents';
import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';
import { FiltersNotificationActionApi } from './filters_notification_action';

export interface FiltersNotificationProps {
  api: FiltersNotificationActionApi;
  displayName: string;
  icon: string;
  id: string;
}

export function FiltersNotificationPopover({
  displayName,
  icon,
  api,
  id,
}: FiltersNotificationProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [disableEditbutton, setDisableEditButton] = useState(false);

  const editPanelAction = getEditPanelAction();

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          color="text"
          iconType={icon}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          data-test-subj={`embeddablePanelNotification-${id}`}
          aria-label={displayName}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>{displayName}</EuiPopoverTitle>
      <FiltersNotificationPopoverContents api={api} setDisableEditButton={setDisableEditButton} />
      <EuiPopoverFooter>
        {!disableEditbutton && (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            justifyContent="flexEnd"
            responsive={false}
            wrap={true}
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj={'filtersNotificationModal__editButton'}
                size="s"
                fill
                onClick={() => editPanelAction.execute({ embeddable: api })}
              >
                {dashboardFilterNotificationActionStrings.getEditButtonTitle()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
