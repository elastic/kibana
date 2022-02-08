/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';

/**
 * Props for the Redirect App Link component.
 */
export interface Props extends React.HTMLAttributes<HTMLDivElement> {
  clickHandler: React.MouseEventHandler<HTMLElement> | undefined;
  className?: string;
  'data-test-subj'?: string;
}

export const RedirectAppLinksComponent = ({
  clickHandler,
  children,
  className,
  ...otherProps
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
