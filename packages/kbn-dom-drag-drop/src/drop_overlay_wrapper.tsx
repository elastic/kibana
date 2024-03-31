/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classnames from 'classnames';

/**
 * DropOverlayWrapper Props
 */
export interface DropOverlayWrapperProps {
  isVisible: boolean;
  className?: string;
  overlayProps?: object;
}

/**
 * This prevents the in-place droppable styles (under children) and allows to rather show an overlay with droppable styles (on top of children)
 * @param isVisible
 * @param children
 * @param overlayProps
 * @param className
 * @param otherProps
 * @constructor
 */
export const DropOverlayWrapper: React.FC<DropOverlayWrapperProps> = ({
  isVisible,
  children,
  overlayProps,
  className,
  ...otherProps
}) => {
  return (
    <div className={classnames('domDroppable__overlayWrapper', className)} {...(otherProps || {})}>
      {children}
      {isVisible && (
        <div
          className="domDroppable_overlay"
          data-test-subj="domDroppable_overlay"
          {...(overlayProps || {})}
        />
      )}
    </div>
  );
};
