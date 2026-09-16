/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren, RefObject } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { strings } from '../../../../../strings';
import { ProjectPickerFilterForm } from './filter_form';
import { ProjectPickerFilterDisplay, type EditingFilter } from './filter_display/filter_display';
import { bodyStyles } from './body.styles';
import { useProjectPickerState } from '../../../../state';
import { getIncludedVisibleProjectIds } from '../../../../state/derivatives';

export interface ProjectPickerFrameBodyProps {
  children: React.ReactNode;
  maxHeight?: number;
  scrollContainerRef?: RefObject<HTMLDivElement>;
}

enum FilterViewMode {
  EDIT = 'edit',
  VIEW = 'view',
}

export function ProjectPickerFrameBodyHeader() {
  const { euiTheme } = useEuiTheme();
  const styles = bodyStyles({ euiTheme });
  const [filterViewMode, setFilterViewMode] = useState<FilterViewMode>(FilterViewMode.VIEW);
  const [editingFilter, setEditingFilter] = useState<Pick<EditingFilter, 'id'> | null>(null);

  const state = useProjectPickerState();

  const isReadOnly = useMemo(() => {
    return state.controlsState === 'disabled';
  }, [state.controlsState]);

  const showNoMatchingProjectsWarningCallout = useMemo(() => {
    // `filterExpressions`/`filteredProjectIds` only ever change together (see `proposedFilters`
    // in reducers.ts), so this can never observe a stale/mismatched pairing. The pending check is
    // a defensive belt-and-suspenders guard, since a pending proposal (including a failed one,
    // which leaves the proposal in place) always implies its own dedicated error callout instead.
    return (
      getIncludedVisibleProjectIds(state).length === 0 &&
      state.filterExpressions.size > 0 &&
      !state.isFilterProposalPending
    );
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
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      css={styles.bodyContainer}
      data-test-subj="projectPickerFrameBodyHeader"
    >
      {isReadOnly && (
        <EuiFlexItem grow={false}>
          <KbnInfoCallout
            announceOnMount={false}
            size="s"
            title={strings.getProjectPickerReadonlyCallout()}
          />
        </EuiFlexItem>
      )}
      {showNoMatchingProjectsWarningCallout && (
        <EuiFlexItem grow={false}>
          <KbnWarningCallout
            announceOnMount
            size="s"
            title={i18n.translate('cpsUtils.projectPicker.filterBox.noMatch.calloutTitle', {
              defaultMessage: 'No projects are currently being searched',
            })}
            data-test-subj="projectPickerFilterDisplayNoMatchCallout"
            text={
              <p>
                {i18n.translate('cpsUtils.projectPicker.filterBox.noMatch.calloutDescription', {
                  defaultMessage:
                    'Adjust your project filters and toggles to ensure at least one project is included in your search.',
                })}
              </p>
            }
          />
        </EuiFlexItem>
      )}
      {state.filterSearchError && (
        <EuiFlexItem grow={false}>
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.translate('cpsUtils.projectPicker.filterBox.searchError.calloutTitle', {
              defaultMessage: 'Unable to update project search',
            })}
            data-test-subj="projectPickerFilterSearchErrorCallout"
            text={
              <p>
                {i18n.translate('cpsUtils.projectPicker.filterBox.searchError.calloutDescription', {
                  defaultMessage:
                    'Something went wrong while searching for matching projects. Try again.',
                })}
              </p>
            }
          />
        </EuiFlexItem>
      )}
      {Boolean(state.displayedFilterExpressions.size) ? (
        <EuiFlexItem grow={false}>
          <ProjectPickerFilterDisplay
            onEditFilter={handleEditFilterRequest}
            currentFilterInputId={editingFilter?.id}
          />
        </EuiFlexItem>
      ) : null}
      {filterViewMode === FilterViewMode.VIEW ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            css={styles.filterCreateButton}
            data-test-subj="projectPickerFilterDisplayAddFilterBtn"
            flush="both"
            disabled={isReadOnly || state.isFilterProposalPending}
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
        <EuiFlexItem grow={false}>
          <ProjectPickerFilterForm
            filterId={editingFilter?.id}
            onCloseFilterFormRequested={handleCloseFilterFormRequested}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

export function ProjectPickerFrameBody({
  children,
  maxHeight,
  scrollContainerRef,
}: PropsWithChildren<ProjectPickerFrameBodyProps>) {
  const { euiTheme } = useEuiTheme();
  const styles = bodyStyles({ euiTheme });
  const state = useProjectPickerState();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={css([styles.bodyContainer, { maxHeight }])}
      ref={scrollContainerRef}
    >
      {state.controlsState !== 'hidden' && (
        <EuiFlexItem grow={false} css={styles.filterBoxWrapper}>
          <ProjectPickerFrameBodyHeader />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
