/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import type { ChromeUserBanner } from '@kbn/core-chrome-browser';
import { HeaderExtension } from './header_extension';

export interface HeaderTopBannerProps {
  headerBanner$: Observable<ChromeUserBanner | undefined>;
}

export const HeaderTopBanner: FC<HeaderTopBannerProps> = ({ headerBanner$ }) => {
  const headerBanner = useObservable(headerBanner$, undefined);
  if (!headerBanner) {
    return null;
  }

  return (
    <div className="header__topBanner" data-test-subj="headerTopBanner">
      <HeaderExtension
        containerClassName="header__topBannerContainer"
        display="block"
        extension={headerBanner.content}
      />
    </div>
  );
};
