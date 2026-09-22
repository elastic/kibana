/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiIconTip } from '@elastic/eui';
import type { EuiIconProps } from '@elastic/eui';

/** Renders an optional title icon or accessible tooltip anchor. */
export const renderTitleIcon = (
  icon: EuiIconProps['type'] | undefined,
  tooltip: ReactNode
): ReactNode =>
  tooltip ? (
    <EuiIconTip type={icon ?? 'info'} content={tooltip} />
  ) : icon ? (
    <EuiIcon type={icon} aria-hidden />
  ) : null;

/** Renders a title node with an optional trailing icon. */
export const renderTitleWithIcon = (titleNode: ReactNode, iconNode: ReactNode): ReactNode => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>{titleNode}</EuiFlexItem>
    {iconNode && <EuiFlexItem grow={false}>{iconNode}</EuiFlexItem>}
  </EuiFlexGroup>
);
