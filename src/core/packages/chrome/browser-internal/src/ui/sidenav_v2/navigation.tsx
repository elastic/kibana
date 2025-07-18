/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useObservable from 'react-use/lib/useObservable';
import { Navigation as NavigationComponent } from '@kbn/core-chrome-navigation';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@kbn/shared-ux-router';
import { Global, css } from '@emotion/react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import {
  LOGO,
  PRIMARY_MENU_ITEMS,
  PRIMARY_MENU_FOOTER_ITEMS,
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
} from '@kbn/core-chrome-navigation/src/mocks/observability';

const demoItems = {
  primaryItems: PRIMARY_MENU_ITEMS,
  footerItems: PRIMARY_MENU_FOOTER_ITEMS,
};

export interface Props {
  isSideNavCollapsed$: BehaviorSubject<boolean>;
  history: InternalApplicationStart['history'];

  /** TODO: remove this prop */
  setWidth: (width: number) => void;
}

export const Navigation = ({ isSideNavCollapsed$, history, setWidth }: Props) => {
  const isCollapsed = useObservable(isSideNavCollapsed$, isSideNavCollapsed$.getValue());

  return (
    <>
      <Global
        styles={css`
          :root {
            // have to provide this fallback to avoid bugs when EuiCollapsibleNavBeta is missing
            --euiCollapsibleNavOffset: 0px;
          }
        `}
      />
      <Router history={history}>
        <NavigationComponent
          isCollapsed={isCollapsed}
          items={demoItems}
          logoLabel={LOGO.label}
          logoType={LOGO.logoType}
          setWidth={setWidth}
        />
      </Router>
    </>
  );
};
