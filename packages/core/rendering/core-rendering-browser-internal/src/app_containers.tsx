/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, PropsWithChildren } from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import classNames from 'classnames';
import { APP_WRAPPER_CLASS } from '@kbn/core-application-common';
import { HelpTopic } from '@elastic/help-center-common';
import { HostContextProvider, GuidePopover } from '@elastic/help-center-host';

export const AppWrapper: FC<
  PropsWithChildren<{
    chromeVisible$: Observable<boolean>;
  }>
> = ({ chromeVisible$, children }) => {
  const visible = useObservable(chromeVisible$);
  return (
    <div
      className={classNames(APP_WRAPPER_CLASS, { 'kbnAppWrapper--hiddenChrome': !visible })}
      data-test-subj={`kbnAppWrapper ${visible ? 'visible' : 'hidden'}Chrome`}
    >
      {children}
    </div>
  );
};

export const HelpCenterWrapper: FC<
  PropsWithChildren<{
    helpTopics$: Observable<Record<string, HelpTopic>>;
    helpCenterUrl$: Observable<string | undefined>;
    version$: Observable<string | undefined>;
  }>
> = ({ helpTopics$, version$, helpCenterUrl$, children }) => {
  const helpTopics = useObservable(helpTopics$);
  const version = useObservable(version$);
  const helpCenterUrl = useObservable(helpCenterUrl$);

  if (!helpTopics || !version || !helpCenterUrl) {
    return <>{children}</>;
  }

  return (
    <HostContextProvider {...{ helpCenterUrl, helpTopics, version }}>
      {children}
      <GuidePopover />
    </HostContextProvider>
  );
};
