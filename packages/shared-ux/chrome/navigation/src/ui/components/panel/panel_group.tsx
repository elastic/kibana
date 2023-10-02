/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC } from 'react';
import {
  EuiListGroup,
  EuiTitle,
  useEuiTheme,
  euiFontSize,
  type EuiThemeComputed,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';

import { PanelNavItem } from './panel_nav_item';
import { PanelNavNode } from './types';

const getClassnames = (euiTheme: EuiThemeComputed<{}>) => ({
  title: css`
    text-transform: uppercase;
    color: ${euiTheme.colors.darkShade};
    padding-left: ${euiTheme.size.s};
    padding-bottom: ${euiTheme.size.s};
    ${euiFontSize({ euiTheme } as UseEuiTheme<{}>, 'xxs')}
    font-weight: ${euiTheme.font.weight.medium};
  `,
});

interface Props {
  navNode: PanelNavNode;
}

export const PanelGroup: FC<Props> = ({ navNode }) => {
  const { euiTheme } = useEuiTheme();

  if (!navNode.children?.length) {
    return null;
  }

  const classNames = getClassnames(euiTheme);

  return (
    <>
      <EuiTitle size="xxxs" className={classNames.title}>
        <h2>{navNode.title}</h2>
      </EuiTitle>
      <EuiListGroup css={{ paddingLeft: 0, paddingRight: 0 }}>
        {navNode.children.map((item) => (
          <PanelNavItem key={item.id} item={item} />
        ))}
      </EuiListGroup>
    </>
  );
};
