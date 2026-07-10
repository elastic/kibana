/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { ProjectPickerFilterForm } from './filter_form';
import { ProjectPickerFilterDisplay } from './filter_display';
import { bodyStyles } from './body.styles';

interface ProjectPickerFrameBodyProps {
  children: React.ReactNode;
}

enum FilterViewMode {
  EDIT = 'edit',
  VIEW = 'view',
}

export function ProjectPickerFrameBody({
  children,
}: PropsWithChildren<ProjectPickerFrameBodyProps>) {
  const { euiTheme } = useEuiTheme();
  const styles = bodyStyles({ euiTheme });
  const [filterViewMode, setFilterViewMode] = useState<FilterViewMode>(FilterViewMode.VIEW);
  const [filterExpression, setFilterExpression] = useState<string | null>(null);
  const handleEditFilterRequest = useCallback((filter: string) => {
    setFilterViewMode(FilterViewMode.EDIT);
    setFilterExpression(filter);
  }, []);

  const handleCloseFilterFormRequested = useCallback(() => {
    setFilterViewMode(FilterViewMode.VIEW);
    setFilterExpression(null);
  }, []);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem css={styles.filterBoxWrapper}>
        {filterViewMode === FilterViewMode.VIEW ? (
          <ProjectPickerFilterDisplay onEditFilter={handleEditFilterRequest} />
        ) : null}
        {filterViewMode === FilterViewMode.EDIT ? (
          <ProjectPickerFilterForm
            defaultFilterExpression={filterExpression}
            onCloseFilterFormRequested={handleCloseFilterFormRequested}
          />
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
