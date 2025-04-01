/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React from 'react';

import {
  DistributiveOmit,
  EuiAvatar,
  EuiAvatarProps,
  IconType,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';

import { SolutionNameType } from './types';

import textureImage from './assets/texture.svg';

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

  const { euiTheme } = useEuiTheme();
  const styles = {
    base: css(useEuiShadow('s')),
    xxl: css`
      ${useEuiShadow('m')};
      line-height: calc(${euiTheme.size.xs} * 25);
      width: calc(${euiTheme.size.xs} * 25);
      height: calc(${euiTheme.size.xs} * 25);
      border-radius: calc(${euiTheme.size.xs} * 25);
      display: inline-block;
      background: ${euiTheme.colors.backgroundBasePlain} url(${textureImage}) no-repeat;
      background-size: cover, 125%;
      text-align: center;
    `,
  };

  return (
    // @ts-ignore Complains about ExclusiveUnion between `iconSize` and `iconType`, but works fine
    <EuiAvatar
      css={[styles.base, size === 'xxl' && styles.xxl]}
      className={className}
      size={size === 'xxl' ? 'xl' : size}
      iconSize={size}
      color="plain"
      {...rest}
      {...icon}
    />
  );
};
