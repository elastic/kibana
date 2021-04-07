/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import classNames from 'classnames';

export const APP_WRAPPER_CLASS = 'kbnAppWrapper';

export const AppWrapper: React.FunctionComponent<{
  chromeVisible$: Observable<boolean>;
  classes$?: Observable<string[]>;
}> = ({ chromeVisible$, classes$, children }) => {
  const visible = useObservable(chromeVisible$);
  const classes = useObservable(classes$, ['']);
  return (
    <div
      className={classNames(
        APP_WRAPPER_CLASS,
        { 'kbnAppWrapper--hiddenChrome': !visible },
        classes
      )}
    >
      {children}
    </div>
  );
};

// TODO: Permanently delete
// export const AppContainer: React.FunctionComponent<{
//   classes$: Observable<string[]>;
// }> = ({ classes$, children }) => {
//   const classes = useObservable(classes$);
//   return <div className={classNames(APP_WRAPPER_CLASS, classes)}>{children}</div>;
// };
