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
  EuiPopover,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiPopoverFooter,
} from '@elastic/eui';
import { EditPanelAction } from '@kbn/embeddable-plugin/public';

import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';
import { FiltersNotificationActionContext } from './filters_notification_action';
import { FiltersNotificationPopoverContents } from './filters_notification_popover_contents';

export interface FiltersNotificationProps {
  context: FiltersNotificationActionContext;
  editPanelAction: EditPanelAction;
  displayName: string;
  icon: string;
  id: string;
}

export function FiltersNotificationPopover({
  editPanelAction,
  displayName,
  context,
  icon,
  id,
}: FiltersNotificationProps) {
  const { embeddable } = context;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
      <FiltersNotificationPopoverContents context={context} />
      <EuiPopoverFooter>
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
              onClick={() => editPanelAction.execute({ embeddable })}
            >
              {dashboardFilterNotificationActionStrings.getEditButtonTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
