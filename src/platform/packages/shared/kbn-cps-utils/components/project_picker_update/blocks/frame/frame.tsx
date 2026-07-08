/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';
import { EuiSplitPanel } from '@elastic/eui';

import {
  ProjectPickerFrameHeader,
  ProjectPickerFrameBody,
  ProjectPickerFrameFooter,
} from './partials';

export function ProjectPickerFrame({ children }: PropsWithChildren) {
  return (
    <EuiSplitPanel.Outer>
      <EuiSplitPanel.Inner>
        <ProjectPickerFrameHeader />
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <ProjectPickerFrameBody>{children}</ProjectPickerFrameBody>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="subdued">
        <ProjectPickerFrameFooter />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
