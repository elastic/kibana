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
  unstyled?: boolean;
  footerChildren?: React.ReactNode;
}

export const NavigationUI: FC<Props> = ({ children, unstyled, footerChildren, homeRef }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiCollapsibleNavGroup css={{ background: euiTheme.colors.darkestShade, height: '50px' }}>
        <NavHeader homeHref={homeRef} />
      </EuiCollapsibleNavGroup>

      {unstyled ? (
        <>{children}</>
      ) : (
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          style={{ overflowY: 'auto' }}
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>{children}</EuiFlexItem>

          {footerChildren && <EuiFlexItem grow={false}>{footerChildren}</EuiFlexItem>}
        </EuiFlexGroup>
      )}
    </>
  );
};
