/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { ProjectPickerFilterForm } from './filter_form';
import { ProjectPickerFilterDisplay, type EditingFilter } from './filter_display/filter_display';
import { bodyStyles } from './body.styles';
import { useProjectPickerState } from '../../../../state';
import { getIncludedVisibleProjectIds } from '../../../../state/derivatives';

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
  const [editingFilter, setEditingFilter] = useState<Pick<EditingFilter, 'id'> | null>(null);

  const state = useProjectPickerState();

  const showNoMatchingProjectsWarningCallout = useMemo(() => {
    return getIncludedVisibleProjectIds(state).length === 0 && state.filterExpressions.size > 0;
  }, [state]);

  const handleEditFilterRequest = useCallback((filter: Pick<EditingFilter, 'id'> | null) => {
    setFilterViewMode(FilterViewMode.EDIT);
    setEditingFilter(filter);
  }, []);

  const handleCloseFilterFormRequested = useCallback(() => {
    setFilterViewMode(FilterViewMode.VIEW);
    setEditingFilter(null);
  }, []);

  const handleFilterCreateClick = useCallback(() => {
    setFilterViewMode(FilterViewMode.EDIT);
  }, []);

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={styles.bodyContainer}>
      <EuiFlexItem css={styles.filterBoxWrapper}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {showNoMatchingProjectsWarningCallout && (
            <EuiFlexItem>
              <KbnWarningCallout
                announceOnMount
                title={i18n.translate('cpsUtils.projectPicker.filterBox.noMatch.calloutTitle', {
                  defaultMessage: 'No projects are currently being searched',
                })}
                data-test-subj="projectPickerFilterDisplayNoMatchCallout"
              >
                <p>
                  {i18n.translate('cpsUtils.projectPicker.filterBox.noMatch.calloutDescription', {
                    defaultMessage:
                      'Adjust your project filters and toggles to ensure at least one project is included in your search.',
                  })}
                </p>
              </KbnWarningCallout>
            </EuiFlexItem>
          )}
          {Boolean(state.filterExpressions.size) ? (
            <EuiFlexItem>
              <ProjectPickerFilterDisplay onEditFilter={handleEditFilterRequest} />
            </EuiFlexItem>
          ) : null}
          {filterViewMode === FilterViewMode.VIEW ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                css={styles.filterCreateButton}
                data-test-subj="projectPickerFilterDisplayAddFilterBtn"
                flush="both"
                disabled={state.isReadOnly}
                onClick={handleFilterCreateClick}
              >
                <EuiText size="xs">
                  {i18n.translate('cpsUtils.projectPicker.filterDisplay.addFilterBtnText', {
                    defaultMessage: 'Add project tag filter',
                  })}
                </EuiText>
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
          {filterViewMode === FilterViewMode.EDIT ? (
            <EuiFlexItem>
              <ProjectPickerFilterForm
                filterId={editingFilter?.id}
                onCloseFilterFormRequested={handleCloseFilterFormRequested}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
