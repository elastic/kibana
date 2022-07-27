/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { css } from '@emotion/react';
import {
  EditPanelAction,
  FilterableEmbeddable,
  IEmbeddable,
  ViewMode,
} from '@kbn/embeddable-plugin/public';
import { FiltersNotificationActionContext } from './filters_notification_badge';
import { dashboardFilterNotificationBadge } from '../../dashboard_strings';
import { DashboardContainer } from '../embeddable';

export interface FiltersNotificationProps {
  context: FiltersNotificationActionContext;
  displayName: string;
  id: string;
  editPanelAction: EditPanelAction;
  onClose: () => void;
}

export function FiltersNotificationModal({
  context,
  displayName,
  id,
  editPanelAction,
  onClose,
}: FiltersNotificationProps) {
  const { embeddable } = context;

  const filters = (embeddable as IEmbeddable & FilterableEmbeddable).getFilters();
  const dataViewList: DataView[] = (embeddable.getRoot() as DashboardContainer)?.getAllDataViews();
  const viewMode = embeddable.getInput()?.viewMode;

  return (
    <>
      <EuiModalHeader id="filtersNotificationModal__header">
        <EuiModalHeaderTitle>
          <h2 id={`title-${id}`}>{displayName}</h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody id="filtersNotificationModal__body">
        <EuiFlexGroup
          wrap={true}
          gutterSize="xs"
          // the following makes it so that the filter pills respect the inner padding of the modal body
          // regardless of what the gutter size is
          css={css`
            max-width: 100%;
          `}
        >
          <FilterItems filters={filters} indexPatterns={dataViewList} readOnly={true} />
        </EuiFlexGroup>
      </EuiModalBody>

      {viewMode !== ViewMode.VIEW && (
        <EuiModalFooter id="filtersNotificationModal__footer">
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onClose}
                data-test-subj="filtersNotificationModal__closeButton"
              >
                {dashboardFilterNotificationBadge.getCloseButtonTitle()}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="filtersNotificationModal__editButton"
                onClick={() => {
                  onClose();
                  editPanelAction.execute(context);
                }}
                fill
              >
                {dashboardFilterNotificationBadge.getEditButtonTitle()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      )}
    </>
  );
}
