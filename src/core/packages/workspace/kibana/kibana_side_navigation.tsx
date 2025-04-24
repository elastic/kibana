/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { css } from '@emotion/react';
import { EuiCollapsibleNavBeta } from '@elastic/eui';
import { useIsNavigationCollapsed } from '@kbn/core-workspace-state';
import { EmotionFn } from './types';

export type KibanaSideNavProps = Pick<
  InternalChromeStart['projectNavigation'],
  'getActiveNodes$' | 'getProjectSideNavComponent$'
>;

const root: EmotionFn = ({ euiTheme }) => css`
  & .euiCollapsibleNavButtonWrapper {
    display: none;
  }

  & .euiCollapsibleNavBeta {
    left: 0;

    .euiCollapsibleNavLink svg {
      transform: scale(1);
    }

    .euiCollapsibleNavGroup__children .euiSpacer:first-child {
      display: none;
    }

    .sideNavPanel {
      background-color: ${euiTheme.colors.backgroundBasePlain};
      margin-top: 1px;
      border-top-left-radius: ${euiTheme.border.radius.medium};
    }
  }

  & .euiCollapsibleNav__footer {
    border-top: none;
    position: relative;

    :after {
      content: '';
      display: block;
      border-top: 1px solid ${euiTheme.border.color};
      position: absolute;
      top: 0;
      left: ${euiTheme.size.s};
      right: ${euiTheme.size.s};
      height: 1px;
    }
  }
`;

export const KibanaSideNavigation = ({
  getActiveNodes$,
  getProjectSideNavComponent$,
}: KibanaSideNavProps) => {
  const isCollapsed = useIsNavigationCollapsed();
  const activeNodes = useObservable(getActiveNodes$(), []);
  const CustomSideNavComponent = useObservable(getProjectSideNavComponent$(), {
    current: null,
  });

  const SideNavComponent = useMemo(() => {
    if (CustomSideNavComponent.current) {
      return CustomSideNavComponent.current;
    }
    return () => null;
  }, [CustomSideNavComponent]);

  return (
    <div css={root}>
      <EuiCollapsibleNavBeta {...{ isCollapsed }}>
        <SideNavComponent activeNodes={activeNodes} />
      </EuiCollapsibleNavBeta>
    </div>
  );
};
