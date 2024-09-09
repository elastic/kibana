/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

import {
  LegacyUnlinkFromLibraryAction,
  LegacyUnlinkPanelFromLibraryActionApi,
} from './legacy_unlink_from_library_action';
import { dashboardLibraryNotificationStrings } from './_dashboard_actions_strings';
import {
  UnlinkFromLibraryAction,
  UnlinkPanelFromLibraryActionApi,
} from './unlink_from_library_action';

export interface LibraryNotificationProps {
  api: UnlinkPanelFromLibraryActionApi | LegacyUnlinkPanelFromLibraryActionApi;
  unlinkAction: UnlinkFromLibraryAction | LegacyUnlinkFromLibraryAction;
}

export function LibraryNotificationPopover({ unlinkAction, api }: LibraryNotificationProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          color="text"
          iconType={'folderCheck'}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          data-test-subj={'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION'}
          aria-label={dashboardLibraryNotificationStrings.getPopoverAriaLabel()}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>{dashboardLibraryNotificationStrings.getDisplayName()}</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText>
          <p>{dashboardLibraryNotificationStrings.getTooltip()}</p>
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
              onClick={() => {
                setIsPopoverOpen(false);
                unlinkAction.execute({ embeddable: api });
              }}
            >
              {unlinkAction.getDisplayName({ embeddable: api })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
