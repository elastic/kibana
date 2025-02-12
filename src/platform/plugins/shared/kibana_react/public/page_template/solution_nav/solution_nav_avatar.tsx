/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { FunctionComponent } from 'react';

import {
  DistributiveOmit,
  EuiAvatar,
  EuiAvatarProps,
  useEuiTheme,
  useEuiShadow,
} from '@elastic/eui';

export type KibanaPageTemplateSolutionNavAvatarProps = DistributiveOmit<EuiAvatarProps, 'size'> & {
  /**
   * Any EuiAvatar size available, of `xxl` for custom large, brand-focused version
   */
  size?: EuiAvatarProps['size'] | 'xxl';
};

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const KibanaPageTemplateSolutionNavAvatar: FunctionComponent<
  KibanaPageTemplateSolutionNavAvatarProps
> = ({ className, size, ...rest }) => {
  const { euiTheme } = useEuiTheme();

  const pageTemplateSolutionNavAvatarStyles = {
    base: css(useEuiShadow('s')),
    xxl: css`
      ${useEuiShadow('m')};
      width: 100px;
      height: 100px;
      line-height: 100px;
      border-radius: 100px;
      display: inline-block;
      background: ${euiTheme.colors.backgroundBasePlain} url('../../assets/texture.svg') no-repeat;
      background-size: cover, 125%;
      text-align: center;
    `,
  };

  return (
    // @ts-expect-error Complains about ExclusiveUnion between `iconSize` and `iconType`, but works fine
    <EuiAvatar
      className={className}
      css={[
        pageTemplateSolutionNavAvatarStyles.base,
        size === 'xxl' && pageTemplateSolutionNavAvatarStyles.xxl,
      ]}
      color="plain"
      size={size === 'xxl' ? 'xl' : size}
      iconSize={size}
      {...rest}
    />
  );
};
