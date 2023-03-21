/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, ReactElement } from 'react';

import classNames from 'classnames';
import './floating_actions.scss';

export interface FloatingActionsProps {
  className?: string;
  actions?: JSX.Element;
  children: ReactElement;
  isEnabled?: boolean;
}

export const FloatingActions: FC<FloatingActionsProps> = ({
  className = '',
  actions,
  isEnabled,
  children,
}) => {
  return (
    <div className="presentationUtil__floatingActionsWrapper">
      {children}
      {isEnabled && (
        <div className={classNames('presentationUtil__floatingActions', className)}>{actions}</div>
      )}
    </div>
  );
};
