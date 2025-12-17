/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { Suspense, type FC } from 'react';
import { EuiSkeletonRectangle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeNavigationProps } from './navigation';

export type { ChromeNavigationProps } from './navigation';

const NavigationComponentLazy = React.lazy(() => import('./navigation'));

export const Navigation: FC<ChromeNavigationProps> = (props) => {
  const { euiTheme } = useEuiTheme();
  return (
    <Suspense
      fallback={
        <EuiSkeletonRectangle
          css={css`
            margin: ${euiTheme.size.base};
          `}
          width={16}
          height={16}
          borderRadius="s"
          contentAriaLabel={i18n.translate(
            'core.ui.chrome.sideNavigation.loadingSolutionNavigationLabel',
            { defaultMessage: 'Loading solution navigation' }
          )}
        />
      }
    >
      <NavigationComponentLazy {...props} />
    </Suspense>
  );
};
