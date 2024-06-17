/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';

export interface PageProps {
  title?: React.ReactNode;
}

export const Page: FC<PropsWithChildren<PageProps>> = ({ title = 'Untitled', children }) => {
  return (
    <>
      <EuiPageTemplate.Header>
        <EuiTitle size="l">
          <h1 data-test-subj="responseStreamPageTitle">{title}</h1>
        </EuiTitle>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>{children}</EuiPageTemplate.Section>
    </>
  );
};
