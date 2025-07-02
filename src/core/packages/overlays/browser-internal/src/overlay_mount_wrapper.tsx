/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { MountWrapper, MountWrapperComponentProps } from '@kbn/core-mount-utils-browser-internal';

export function OverlayMountWrapper(props: MountWrapperComponentProps) {
  // NOTE: The kbnOverlayMountWrapper className is used for allowing consumers to add additional styles
  // that support drag-and-drop (padding, pointer styles). It is not used for internal styling.

  return (
    <MountWrapper
      className="kbnOverlayMountWrapper"
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      `}
      {...props}
    />
  );
}
