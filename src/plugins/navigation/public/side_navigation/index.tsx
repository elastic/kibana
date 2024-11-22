/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { Suspense, type FC } from 'react';
import { EuiSkeletonRectangle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { Props as NavigationProps } from './side_navigation';

const SideNavComponentLazy = React.lazy(() => import('./side_navigation'));

export const SideNavComponent: FC<NavigationProps> = (props) => (
  <Suspense
    fallback={
      <EuiSkeletonRectangle
        css={css`
          margin: ${euiThemeVars.euiSize};
        `}
        width={16}
        height={16}
        borderRadius="s"
        contentAriaLabel={i18n.translate(
          'navigation.sideNavigation.loadingSolutionNavigationLabel',
          {
            defaultMessage: 'Loading solution navigation',
          }
        )}
      />
    }
  >
    <SideNavComponentLazy {...props} />
  </Suspense>
);
