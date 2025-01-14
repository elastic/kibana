/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiBackgroundColorCSS, EuiPageTemplate } from '@elastic/eui';

interface RuleFormErrorPromptWrapperProps {
  hasBorder?: boolean;
  hasShadow?: boolean;
}

export const RuleFormErrorPromptWrapper: React.FC<
  React.PropsWithChildren<RuleFormErrorPromptWrapperProps>
> = ({ children, hasBorder, hasShadow }) => {
  const styles = useEuiBackgroundColorCSS().transparent;
  return (
    <EuiPageTemplate offset={0} css={styles}>
      <EuiPageTemplate.EmptyPrompt paddingSize="none" hasBorder={hasBorder} hasShadow={hasShadow}>
        {children}
      </EuiPageTemplate.EmptyPrompt>
    </EuiPageTemplate>
  );
};
