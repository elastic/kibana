/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren, type RefObject, type ComponentProps } from 'react';
import { EuiSplitPanel, useEuiTheme } from '@elastic/eui';
import {
  ProjectPickerFrameHeader,
  ProjectPickerFrameBody,
  ProjectPickerFrameFooter,
} from './partials';
import { projectPickerFrameStyles } from './frame.styles';

interface ProjectPickerFrameProps {
  scrollContainerRef?: RefObject<HTMLDivElement>;
  maxBodyHeight?: ComponentProps<typeof ProjectPickerFrameBody>['maxHeight'];
}

export function ProjectPickerFrame({
  children,
  maxBodyHeight,
  scrollContainerRef,
}: PropsWithChildren<ProjectPickerFrameProps>) {
  const { euiTheme } = useEuiTheme();
  const styles = projectPickerFrameStyles({ euiTheme });

  return (
    <EuiSplitPanel.Outer>
      <EuiSplitPanel.Inner css={styles.headerWrapper}>
        <ProjectPickerFrameHeader />
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="none">
        <ProjectPickerFrameBody maxHeight={maxBodyHeight} scrollContainerRef={scrollContainerRef}>
          {children}
        </ProjectPickerFrameBody>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="subdued">
        <ProjectPickerFrameFooter />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
