/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiTitle, EuiSpacer, EuiSplitPanel, EuiCodeBlock } from '@elastic/eui';

export interface PanelWithCodeBlockProps {
  title: string;
  code: string;
}

export const PanelWithCodeBlock: React.FunctionComponent<PanelWithCodeBlockProps> = ({
  title,
  code,
  children,
}) => (
  <>
    <EuiTitle>
      <h2>{title}</h2>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiSplitPanel.Outer hasBorder>
      <EuiSplitPanel.Inner>{children}</EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="subdued">
        <EuiCodeBlock language="jsx" paddingSize="none" transparentBackground>
          {code}
        </EuiCodeBlock>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  </>
);
