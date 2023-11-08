import { EuiPageTemplate } from '@elastic/eui';
import React from 'react';

const restrictWidth = '75%';

export function Template({ children }: { children: React.ReactNode }) {
  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header
        pageTitle="Synthtrace"
        description="UI Generation Tool"
        iconType="logoObservability"
        restrictWidth={restrictWidth}
      />
      <EuiPageTemplate.Section restrictWidth={restrictWidth} color="subdued">
        {children}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
