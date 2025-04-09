/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiPageHeader, EuiPageSection } from '@elastic/eui';

interface LayoutProps {
  extendedBorder?: boolean;
  restrictWidth?: boolean;
  centeredContent?: boolean;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  extendedBorder = true,
  restrictWidth = true,
  centeredContent = false,
  children,
}) => {
  const width = restrictWidth ? '75%' : false;
  const bottomBorder = extendedBorder ? 'extended' : true;
  return (
    <>
      <EuiPageHeader
        paddingSize="l"
        restrictWidth={width}
        bottomBorder={bottomBorder}
        pageTitle="User Settings Demo"
        description="This is demo to demonstrate the use of user settings. It show an example each of a space aware and a space agnostic user setting."
      />
      <EuiPageSection
        restrictWidth={width}
        alignment={centeredContent ? 'center' : 'top'}
        color={extendedBorder ? 'plain' : 'transparent'}
        grow={centeredContent ? true : false}
      >
        {children}
      </EuiPageSection>
    </>
  );
};
