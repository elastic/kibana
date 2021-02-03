/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import classNames from 'classnames';

export const AppWrapper: React.FunctionComponent<{
  chromeVisible$: Observable<boolean>;
}> = ({ chromeVisible$, children }) => {
  const visible = useObservable(chromeVisible$);
  return <div className={classNames('app-wrapper', { 'hidden-chrome': !visible })}>{children}</div>;
};

export const AppContainer: React.FunctionComponent<{
  classes$: Observable<string[]>;
}> = ({ classes$, children }) => {
  const classes = useObservable(classes$);
  return <div className={classNames('application', classes)}>{children}</div>;
};
