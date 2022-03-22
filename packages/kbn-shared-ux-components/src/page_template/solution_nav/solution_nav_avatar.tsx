/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_nav_avatar.scss';

import React from 'react';

import { DistributiveOmit, EuiAvatar, EuiAvatarProps } from '@elastic/eui';
import classNames from 'classnames';

export type KibanaPageTemplateSolutionNavAvatarProps = DistributiveOmit<EuiAvatarProps, 'size'> & {
  /**
   * Any EuiAvatar size available, or `xxl` for custom large, brand-focused version
   */
  size?: EuiAvatarProps['size'] | 'xxl';
};

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const KibanaPageTemplateSolutionNavAvatar = ({
  className,
  size,
  ...rest
}: KibanaPageTemplateSolutionNavAvatarProps) => {
  return (
    // @ts-ignore
    <EuiAvatar
      className={classNames(
        'kbnPageTemplateSolutionNavAvatar',
        {
          [`kbnPageTemplateSolutionNavAvatar--${size}`]: size,
        },
        className
      )}
      size={size === 'xxl' ? 'xl' : size}
      iconSize={size}
      {...rest}
    />
  );
};
