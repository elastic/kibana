/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { LegacyRef } from 'react';
import classNames from 'classnames';

/**
 * Props for the Redirect App Link component.
 */
export interface Props extends React.HTMLAttributes<HTMLDivElement> {
  clickHandler: React.MouseEventHandler<HTMLElement> | undefined;
  containerRef?: LegacyRef<HTMLDivElement>;
  children?: React.ReactNode;
  className?: string;
  'data-test-subj'?: string;
}

export const RedirectAppLinksComponent = ({
  containerRef,
  clickHandler,
  children,
  className,
  ...otherProps
}: Props) => {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      ref={containerRef}
      className={classNames(className, 'kbnRedirectCrossAppLinks')}
      onClick={clickHandler}
      {...otherProps}
    >
      {children}
    </div>
  );
};
