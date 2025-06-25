/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import type { ChromeUserBanner } from '@kbn/core-chrome-browser';
import { css } from '@emotion/react';
import { HeaderExtension } from './header_extension';

export interface HeaderTopBannerProps {
  headerBanner$: Observable<ChromeUserBanner | undefined>;
  position?: 'fixed' | 'static';
}

const styles = {
  root: {
    fixed: css`
      position: fixed;
      top: 0;
      left: 0;
      height: var(--kbnHeaderBannerHeight);
      width: 100%;
    `,
    static: css`
      height: var(--kbnHeaderBannerHeight);
      width: 100%;
    `,
  },
  container: css`
    .header__topBannerContainer {
      height: 100%;
      width: 100%;
    }
  `,
};

export const HeaderTopBanner: FC<HeaderTopBannerProps> = ({
  headerBanner$,
  position = 'fixed',
}) => {
  const headerBanner = useObservable(headerBanner$, undefined);
  if (!headerBanner) {
    return null;
  }

  return (
    <div
      css={[
        styles.root[position],
        styles.container,
        ({ euiTheme }) => ({
          zIndex: euiTheme.levels.header,
        }),
      ]}
      data-test-subj="headerTopBanner"
    >
      <HeaderExtension
        containerClassName="header__topBannerContainer"
        display="block"
        extension={headerBanner.content}
      />
    </div>
  );
};
