/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_nav_avatar.scss';

import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

import { EuiAvatar, EuiAvatarProps } from '@elastic/eui';

export type KibanaPageTemplateSolutionNavAvatarProps = EuiAvatarProps;

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const KibanaPageTemplateSolutionNavAvatar: FunctionComponent<KibanaPageTemplateSolutionNavAvatarProps> = ({
  className,
  ...rest
}) => {
  return (
    <EuiAvatar
      className={classNames('kbnPageTemplateSolutionNavAvatar', className)}
      color="plain"
      {...rest}
    />
  );
};
