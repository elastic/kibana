/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DistributiveOmit, EuiAvatarProps } from '@elastic/eui';
import { EuiAvatar } from '@elastic/eui';
import classNames from 'classnames';
import type { FunctionComponent } from 'react';
import React from 'react';
import './solution_nav_avatar.scss';

export type KibanaPageTemplateSolutionNavAvatarProps = DistributiveOmit<EuiAvatarProps, 'size'> & {
  /**
   * Any EuiAvatar size available, of `xxl` for custom large, brand-focused version
   */
  size?: EuiAvatarProps['size'] | 'xxl';
};

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const KibanaPageTemplateSolutionNavAvatar: FunctionComponent<KibanaPageTemplateSolutionNavAvatarProps> = ({
  className,
  size,
  ...rest
}) => {
  return (
    // @ts-ignore Complains about ExclusiveUnion between `iconSize` and `iconType`, but works fine
    <EuiAvatar
      className={classNames(
        'kbnPageTemplateSolutionNavAvatar',
        {
          [`kbnPageTemplateSolutionNavAvatar--${size}`]: size,
        },
        className
      )}
      color="plain"
      size={size === 'xxl' ? 'xl' : size}
      iconSize={size}
      {...rest}
    />
  );
};
