/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiMarkdownFormat } from '@elastic/eui';

export interface SummaryResponseProps {
  summary: string;
}

export const SummaryResponse: React.FC<SummaryResponseProps> = ({ summary }) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiPanel
        color="subdued"
        data-test-subj="caseSummaryResponse"
        hasBorder={false}
        hasShadow={false}
      >
        <EuiMarkdownFormat textSize="s">{summary}</EuiMarkdownFormat>
      </EuiPanel>
    </>
  );
};

SummaryResponse.displayName = 'CaseSummaryResponse';
