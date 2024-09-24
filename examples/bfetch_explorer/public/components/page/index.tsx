/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiPageTemplate, EuiPageSection, EuiPageHeader } from '@elastic/eui';

export interface PageProps {
  title?: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const Page: FC<PropsWithChildren<PageProps>> = ({
  title = 'Untitled',
  sidebar,
  children,
}) => {
  return (
    <EuiPageTemplate offset={0} grow={true}>
      <EuiPageTemplate.Sidebar>{sidebar}</EuiPageTemplate.Sidebar>
      <EuiPageTemplate.Header>
        <EuiPageHeader pageTitle={title} />
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiPageSection style={{ maxWidth: 800, margin: '0 auto' }}>{children}</EuiPageSection>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
