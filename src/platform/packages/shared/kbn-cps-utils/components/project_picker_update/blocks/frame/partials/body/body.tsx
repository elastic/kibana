/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { ProjectPickerFilterBox } from './filter_box';
import { bodyStyles } from './body.styles';

interface ProjectPickerFrameBodyProps {
  children: React.ReactNode;
  maxHeight?: number;
}

export function ProjectPickerFrameBody({
  children,
}: PropsWithChildren<ProjectPickerFrameBodyProps>) {
  const { euiTheme } = useEuiTheme();
  const styles = bodyStyles({ euiTheme });

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem css={styles.filterBoxWrapper}>
        <ProjectPickerFilterBox filteringDimensions={[]} />
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
