/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_avatar.scss';

import React from 'react';

import { DistributiveOmit, EuiAvatar, EuiAvatarProps } from '@elastic/eui';
import classNames from 'classnames';

export type KibanaSolutionAvatarProps = DistributiveOmit<EuiAvatarProps, 'size'> & {
  /**
   * Any EuiAvatar size available, or `xxl` for custom large, brand-focused version
   */
  size?: EuiAvatarProps['size'] | 'xxl';
};

/**
 * Applies extra styling to a typical EuiAvatar.
 * The `name` value will be appended to 'logo' to configure the `iconType` unless `iconType` is provided.
 */
export const KibanaSolutionAvatar = ({ className, size, ...rest }: KibanaSolutionAvatarProps) => {
  return (
    // @ts-ignore Complains about ExclusiveUnion between `iconSize` and `iconType`, but works fine
    <EuiAvatar
      className={classNames(
        'kbnSolutionAvatar',
        {
          [`kbnSolutionAvatar--${size}`]: size,
        },
        className
      )}
      size={size === 'xxl' ? 'xl' : size}
      iconSize={size}
      color="plain"
      iconType={`logo${rest.name}`}
      {...rest}
    />
  );
};
