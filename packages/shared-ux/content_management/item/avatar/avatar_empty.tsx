/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CmAvatarUi, type CmAvatarUiProps } from './avatar_ui';

/**
 * Props of {@link CmAvatarEmpty} component.
 */
export type CmAvatarEmptyProps = Pick<CmAvatarUiProps, 'size' | 'disabled'>;

/**
 * Renders an empty avatar, for example, when data is not available.
 */
export const CmAvatarEmpty: React.FC<CmAvatarEmptyProps> = (props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <CmAvatarUi
      {...props}
      title="?"
      color={euiTheme.colors.lightestShade}
    />
  );
};
