/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLoadingChart, EuiPanel } from '@elastic/eui';

export const PanelLoader = (props: { showShadow?: boolean; dataTestSubj?: string }) => {
  return (
    <EuiPanel
      role="figure"
      paddingSize="none"
      hasShadow={props.showShadow ?? false}
      className={'embPanel embPanel--loading embPanel-isLoading'}
      data-test-subj={props.dataTestSubj}
    >
      <EuiLoadingChart size="l" mono />
    </EuiPanel>
  );
};
