/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiAvatar } from '@elastic/eui';
import type { TSize } from '../types';

/**
 * Props of {@link CmAvatarUi} component.
 */
export interface CmAvatarUiProps {
  title: string;
  size?: TSize;
  round?: boolean;
  disabled?: boolean;
  color?: string;
}

/**
 * A presentational component of "avatar" view for a single content item.
 */
export const CmAvatarUi: React.FC<CmAvatarUiProps> = (props) => {
  const { title, size, round, disabled, color } = props;

  // TODO: Compute color here.

  return (
    <EuiAvatar
      name={title}
      size={size}
      type={round ? 'user' : 'space'}
      isDisabled={disabled}
      color={color}
    />
  );
};
