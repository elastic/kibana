/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import {
  EuiCollapsibleNavBeta,
  EuiHeader,
  EuiHeaderSection,
  EuiLink,
  EuiPageTemplate,
} from '@elastic/eui';

export const Template: FC = ({ children }) => {
  return (
    <>
      <EuiHeader position="fixed">
        <EuiHeaderSection>
          <EuiCollapsibleNavBeta />
        </EuiHeaderSection>
      </EuiHeader>
      <EuiPageTemplate>
        <EuiPageTemplate.Header pageTitle="Welcome to my page" />
        <EuiPageTemplate.Section grow={true}>{children}</EuiPageTemplate.Section>
        <EuiPageTemplate.Section grow={false}>
          <EuiLink>Contact us</EuiLink>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
