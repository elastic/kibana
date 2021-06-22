/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiText, EuiPageContent } from '@elastic/eui';

export const PageLoading: React.FunctionComponent = ({ children }) => {
  return (
    <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
      <EuiEmptyPrompt
        title={<EuiLoadingSpinner size="xl" />}
        body={<EuiText color="subdued">{children}</EuiText>}
        data-test-subj="sectionLoading"
      />
    </EuiPageContent>
  );
};
