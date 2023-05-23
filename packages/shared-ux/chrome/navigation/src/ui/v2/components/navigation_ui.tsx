/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCollapsibleNavGroup, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React, { FC } from 'react';
import { NavHeader } from './navigation_header';

interface Props {
  homeRef: string;
  footerChildren?: React.ReactNode;
}

export const NavigationUI: FC<Props> = ({ children, footerChildren, homeRef }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      style={{ overflowY: 'auto' }}
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <EuiCollapsibleNavGroup css={{ background: euiTheme.colors.darkestShade, height: '50px' }}>
          <NavHeader homeHref={homeRef} />
        </EuiCollapsibleNavGroup>

        {children}
      </EuiFlexItem>

      {footerChildren && <EuiFlexItem grow={false}>{footerChildren}</EuiFlexItem>}
    </EuiFlexGroup>
  );
};
