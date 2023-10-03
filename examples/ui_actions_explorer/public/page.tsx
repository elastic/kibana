/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiPageBody, EuiPageTemplate, EuiPageSection, EuiPageHeader } from '@elastic/eui';

interface PageProps {
  title: string;
  children: React.ReactNode;
}

export function Page({ title, children }: PageProps) {
  return (
    <EuiPageBody data-test-subj="searchTestPage">
      <EuiPageSection>
        <EuiPageHeader pageTitle={title} />
      </EuiPageSection>
      <EuiPageTemplate.Section>
        <EuiPageSection>{children}</EuiPageSection>
      </EuiPageTemplate.Section>
    </EuiPageBody>
  );
}
