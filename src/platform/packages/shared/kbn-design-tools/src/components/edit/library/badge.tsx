/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBadge,
  EuiBetaBadge,
  EuiNotificationBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export const BadgeRegular = () => <EuiBadge>Default</EuiBadge>;

export const BadgeHollow = () => <EuiBadge color="hollow">Hollow</EuiBadge>;

export const BadgeClickable = () => (
  <EuiBadge onClick={() => {}} onClickAriaLabel="Click badge">
    Clickable
  </EuiBadge>
);

export const BadgeWithIcon = () => (
  <EuiBadge iconType="cross" iconSide="right">
    With icon
  </EuiBadge>
);

export const BadgeDisabled = () => <EuiBadge isDisabled>Disabled</EuiBadge>;

export const BadgeGroup = () => (
  <EuiFlexGroup gutterSize="xs" wrap>
    <EuiFlexItem grow={false}>
      <EuiBadge>Tag 1</EuiBadge>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">Tag 2</EuiBadge>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge>Tag 3</EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const BadgeBeta = () => (
  <EuiBetaBadge label="Beta" tooltipContent="This feature is in beta." />
);

export const BadgeNotification = () => <EuiNotificationBadge>3</EuiNotificationBadge>;
