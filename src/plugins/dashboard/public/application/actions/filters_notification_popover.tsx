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
import { FiltersNotificationActionContext, UnlinkFromLibraryAction } from '.';
import { dashboardLibraryNotification } from '../../dashboard_strings';

export interface FiltersNotificationProps {
  context: FiltersNotificationActionContext;
  unlinkAction: UnlinkFromLibraryAction;
  displayName: string;
  icon: string;
  id: string;
}

export function FiltersNotificationPopover({
  unlinkAction,
  displayName,
  context,
  icon,
  id,
}: FiltersNotificationProps) {
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
          aria-label={'PANEL LEVEL FILTERS ARIA LABEL'}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>Panel Level Filters</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText>
          <p>{JSON.stringify(embeddable.getFilters())}</p>
        </EuiText>
      </div>
    </EuiPopover>
  );
}
