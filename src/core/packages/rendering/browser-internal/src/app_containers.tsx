/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import classNames from 'classnames';
import { APP_WRAPPER_CLASS } from '@kbn/core-application-common';

export const AppWrapper: FC<
  PropsWithChildren<{
    isChromeVisible: boolean;
  }>
> = ({ isChromeVisible, children }) => {
  return (
    <div
      className={classNames(APP_WRAPPER_CLASS, { 'kbnAppWrapper--hiddenChrome': !isChromeVisible })}
      data-test-subj={`kbnAppWrapper ${isChromeVisible ? 'visible' : 'hidden'}Chrome`}
    >
      {children}
    </div>
  );
};
