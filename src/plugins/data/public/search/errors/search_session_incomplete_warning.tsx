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
    This search session had to run some additional search requests in order to fully render. You may
    wait for them on screen or come back to them later.
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
