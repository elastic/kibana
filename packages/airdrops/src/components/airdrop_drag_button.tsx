/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';

import { DragWrapper, Props as DragWrapperProps } from './drag_wrapper';

export interface Props<T = unknown> extends Omit<DragWrapperProps<T>, 'children'> {
  size?: EuiButtonIconProps['size'];
  iconSize?: EuiButtonIconProps['iconSize'];
  display?: EuiButtonIconProps['display'];
}

export function AirdropDragButton<T>({
  size = 's',
  iconSize = 'm',
  display = 'base',
  ...rest
}: Props<T>) {
  return (
    <DragWrapper {...rest}>
      {({ isLoadingContent }) => {
        return (
          <EuiButtonIcon
            iconType="grab"
            size={size}
            iconSize={iconSize}
            display={display}
            isDisabled={isLoadingContent}
            aria-label="Drag"
          />
        );
      }}
    </DragWrapper>
  );
}
