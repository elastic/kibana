/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './solution_avatar.scss';

import React from 'react';
import classNames from 'classnames';

import { DistributiveOmit, EuiAvatar, EuiAvatarProps, IconType } from '@elastic/eui';

import { SolutionNameType } from './types';

export type KnownSolutionProps = DistributiveOmit<EuiAvatarProps, 'size' | 'name' | 'iconType'> & {
  /**
   * Any EuiAvatar size available, or `xxl` for custom large, brand-focused version
   */
  size?: EuiAvatarProps['size'] | 'xxl';
  name: SolutionNameType;
};

export type IconTypeProps = DistributiveOmit<EuiAvatarProps, 'size' | 'name' | 'iconType'> & {
  /**
   * Any EuiAvatar size available, or `xxl` for custom large, brand-focused version
   */
  size?: EuiAvatarProps['size'] | 'xxl';
  name?: string;
  iconType: IconType;
};

const isKnown = (props: any): props is KnownSolutionProps => {
  return typeof props.iconType === 'undefined';
};

export type KibanaSolutionAvatarProps = KnownSolutionProps | IconTypeProps;

/**
 * Applies extra styling to a typical EuiAvatar.
 * The `name` value will be appended to 'logo' to configure the `iconType` unless `iconType` is provided.
 */
export const KibanaSolutionAvatar = (props: KibanaSolutionAvatarProps) => {
  const { className, size, ...rest } = props;

  // If the name is a known solution, use the name to set the correct IconType.
  // Create an empty object so `iconType` remains undefined or inherited from `props`.
  const icon: {
    iconType?: IconType;
  } = {};

  if (isKnown(props)) {
    icon.iconType = `logo${props.name.replace(/\s+/g, '')}`;
  }

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
      {...rest}
      {...icon}
    />
  );
};
