/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

export const SearchSessionIncompleteWarning = () => (
  <>
    <EuiSpacer size="s" />
    It needs more time to fully render. You can wait here or come back to it later.
    <EuiText textAlign="right">
      <EuiButton
        color="warning"
        onClick={() => {}}
        size="s"
        data-test-subj="searchSessionIncompleteWarning"
      >
        Read More
      </EuiButton>
    </EuiText>
  </>
);
