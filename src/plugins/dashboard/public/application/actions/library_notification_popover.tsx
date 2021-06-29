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
  EuiText,
} from '@elastic/eui';
import { LibraryNotificationActionContext, UnlinkFromLibraryAction } from '.';
import { dashboardLibraryNotification } from '../../dashboard_strings';

export interface LibraryNotificationProps {
  context: LibraryNotificationActionContext;
  unlinkAction: UnlinkFromLibraryAction;
  displayName: string;
  icon: string;
  id: string;
}

export function LibraryNotificationPopover({
  unlinkAction,
  displayName,
  context,
  icon,
  id,
}: LibraryNotificationProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { embeddable } = context;

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          color="text"
          iconType={icon}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          data-test-subj={`embeddablePanelNotification-${id}`}
          aria-label={dashboardLibraryNotification.getPopoverAriaLabel()}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>{displayName}</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText>
          <p>{dashboardLibraryNotification.getTooltip()}</p>
        </EuiText>
      </div>
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
              data-test-subj={'libraryNotificationUnlinkButton'}
              size="s"
              fill
              onClick={() => unlinkAction.execute({ embeddable })}
            >
              {unlinkAction.getDisplayName({ embeddable })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
