/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  apiPublishesWritableViewMode,
  getViewModeSubject,
  useBatchedPublishingSubjects,
  type ViewMode,
} from '@kbn/presentation-publishing';
import { isObject } from 'lodash';
import type { InlineEditingProps } from './saved_search_grid';
import { InlineEditFooter } from './inline_edit_footer';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';

const apiPublishesIsEditableByUser = (
  parentApi: unknown
): parentApi is { isEditableByUser: boolean } =>
  isObject(parentApi) &&
  typeof (parentApi as { isEditableByUser?: boolean }).isEditableByUser === 'boolean';

interface SearchEmbeddableDeletedTabPromptProps {
  api: { parentApi?: unknown };
  canShowDashboardWriteControls: boolean;
  inlineEditing: InlineEditingProps;
}

export const SearchEmbeddableDeletedTabPrompt = ({
  api,
  canShowDashboardWriteControls,
  inlineEditing,
}: SearchEmbeddableDeletedTabPromptProps) => {
  const { parentApi } = api;

  const viewModeSubject$ = useMemo(
    () => getViewModeSubject(api) ?? new BehaviorSubject<ViewMode>('view'),
    [api]
  );

  const [viewMode] = useBatchedPublishingSubjects(viewModeSubject$);

  const isEditMode = viewMode === 'edit';

  const canEditDashboardByAccessControl = apiPublishesIsEditableByUser(parentApi)
    ? parentApi.isEditableByUser
    : false;

  const canSwitchToEditMode = apiPublishesWritableViewMode(parentApi);

  const canEditPanelInViewMode =
    canShowDashboardWriteControls && canEditDashboardByAccessControl && canSwitchToEditMode;

  const onEditPanel = useCallback(() => {
    if (canSwitchToEditMode) parentApi.setViewMode('edit');
  }, [canSwitchToEditMode, parentApi]);

  const title = (
    <h2>
      <FormattedMessage
        id="discover.embeddable.deletedTab.warningTitle"
        defaultMessage="The Discover session tab saved with this panel no longer exists"
      />
    </h2>
  );

  const getBody = () => {
    if (!isEditMode) {
      return canEditPanelInViewMode ? (
        <p>
          <FormattedMessage
            id="discover.embeddable.deletedTab.viewModeWarningDescriptionEditable"
            defaultMessage="<EditPanelLink>Edit the panel</EditPanelLink> to fix it."
            values={{
              EditPanelLink: (chunks: React.ReactNode) => (
                <EuiLink
                  data-test-subj="discoverEmbeddableDeletedTabEditPanelLink"
                  onClick={onEditPanel}
                >
                  {chunks}
                </EuiLink>
              ),
            }}
          />
        </p>
      ) : (
        <p>
          <FormattedMessage
            id="discover.embeddable.deletedTab.viewModeWarningDescriptionReadOnly"
            defaultMessage="Contact one of the dashboard's authors to fix it."
          />
        </p>
      );
    }

    return (
      <p>
        <FormattedMessage
          id="discover.embeddable.deletedTab.editModePreEditWarningDescription"
          defaultMessage="Use Edit {editIcon} to choose a different tab"
          values={{
            editIcon: <EuiIcon aria-hidden={true} type="pencil" size="m" />,
          }}
        />
      </p>
    );
  };

  return (
    <SavedSearchEmbeddableBase
      append={
        inlineEditing.isActive ? <InlineEditFooter inlineEditing={inlineEditing} /> : undefined
      }
      dataTestSubj="embeddedSavedSearchDocTable"
      isLoading={false}
    >
      <EuiFlexGroup
        alignItems="center"
        css={{ height: '100%' }}
        gutterSize="none"
        justifyContent="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiEmptyPrompt
            body={getBody()}
            data-test-subj="discoverEmbeddableDeletedTabCallout"
            icon={<EuiIcon aria-hidden={true} color="warning" size="xxl" type="warning" />}
            title={title}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SavedSearchEmbeddableBase>
  );
};
