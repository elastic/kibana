/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiAvatarProps } from '@elastic/eui';
import { EuiAvatar, useEuiTheme } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

/**
 * Props of {@link EmptyAvatar} component.
 */
export interface EmptyAvatarProps {
  size?: EuiAvatarProps['size'];
  isDisabled?: EuiAvatarProps['isDisabled'];
}

/**
 * Renders an empty avatar, for example, when data is not available.
 */
export const EmptyAvatar: FunctionComponent<EmptyAvatarProps> = (props) => {
  const { euiTheme } = useEuiTheme();

  return <EuiAvatar {...props} name="" color={euiTheme.colors.lightestShade} initials="?" />;
};
