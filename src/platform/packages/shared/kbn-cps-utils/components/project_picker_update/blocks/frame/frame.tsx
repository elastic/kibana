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
  type HeaderContextMenuItemProps,
  ProjectPickerFrameBody,
  ProjectPickerFrameFooter,
} from './partials';
import { projectPickerFrameStyles } from './frame.styles';
import { useProjectPickerState } from '../../state';

interface ProjectPickerFrameProps {
  scrollContainerRef?: RefObject<HTMLDivElement>;
  customHeaderContextMenuItems?: HeaderContextMenuItemProps[];
  customHeaderText?: React.ReactNode;
  maxBodyHeight?: ComponentProps<typeof ProjectPickerFrameBody>['maxHeight'];
  showHeader?: boolean;
}

export function ProjectPickerFrame({
  children,
  maxBodyHeight,
  customHeaderContextMenuItems,
  customHeaderText,
  scrollContainerRef,
  showHeader = true,
}: PropsWithChildren<ProjectPickerFrameProps>) {
  const { euiTheme } = useEuiTheme();
  const styles = projectPickerFrameStyles({ euiTheme });
  const state = useProjectPickerState();

  return (
    <EuiSplitPanel.Outer>
      {showHeader && (
        <EuiSplitPanel.Inner css={styles.headerWrapper}>
          <ProjectPickerFrameHeader
            customContextMenuItems={customHeaderContextMenuItems}
            customHeaderText={customHeaderText}
          />
        </EuiSplitPanel.Inner>
      )}
      <EuiSplitPanel.Inner paddingSize="none">
        <ProjectPickerFrameBody maxHeight={maxBodyHeight} scrollContainerRef={scrollContainerRef}>
          {children}
        </ProjectPickerFrameBody>
      </EuiSplitPanel.Inner>
      {state.controlsState !== 'hidden' && (
        <EuiSplitPanel.Inner color="subdued">
          <ProjectPickerFrameFooter />
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
}
