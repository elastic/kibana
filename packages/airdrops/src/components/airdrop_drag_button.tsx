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

interface Props extends Omit<DragWrapperProps, 'children'> {
  size?: EuiButtonIconProps['size'];
  iconSize?: EuiButtonIconProps['iconSize'];
}

export function AirdropDragButton({ size = 's', iconSize = 'm', ...rest }: Props) {
  return (
    <DragWrapper {...rest}>
      <EuiButtonIcon
        display="base"
        iconSize={iconSize}
        size={size}
        iconType="watchesApp"
        aria-label="Next"
      />
    </DragWrapper>
  );
}
