/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  apiPublishesWritableViewMode,
  getViewModeSubject,
  useBatchedPublishingSubjects,
  type ViewMode,
} from '@kbn/presentation-publishing';
import type { InlineEditing } from './saved_search_grid';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';
import { apiPublishesIsEditableByUser } from '../utils/type_guards';

interface SearchEmbeddableMissingDataViewPromptProps {
  api: { parentApi?: unknown };
  canShowDashboardWriteControls: boolean;
  inlineEditing: InlineEditing;
  isByReference: boolean;
  onEditInDiscover?: () => Promise<void>;
}

export const SearchEmbeddableMissingDataViewPrompt = ({
  api,
  canShowDashboardWriteControls,
  inlineEditing,
  isByReference,
  onEditInDiscover,
}: SearchEmbeddableMissingDataViewPromptProps) => {
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

  const getTitle = () => {
    if (isByReference) {
      return (
        <h2>
          <FormattedMessage
            id="discover.embeddable.missingDataView.warningTitleByReference"
            defaultMessage="Couldn't find the data view associated with this Discover session tab."
          />
        </h2>
      );
    }

    return (
      <h2>
        <FormattedMessage
          id="discover.embeddable.missingDataView.warningTitleByValue"
          defaultMessage="Couldn't find the data view associated with this Discover session."
        />
      </h2>
    );
  };

  const getBody = () => {
    const editInDiscoverLink = (chunks: React.ReactNode) => (
      <EuiLink
        data-test-subj="discoverEmbeddableMissingDataViewEditInDiscoverLink"
        onClick={() => void onEditInDiscover?.()}
      >
        {chunks}
      </EuiLink>
    );

    // View mode with read only permissions
    if (!isEditMode && !canEditPanelInViewMode) {
      return (
        <p>
          <FormattedMessage
            id="discover.embeddable.missingDataView.viewModeWarningDescriptionReadOnly"
            defaultMessage="Contact one of the dashboard's authors or Discover session owners to fix it."
          />
        </p>
      );
    }

    // By-value messaging is shared for edit mode and view mode with edit permissions.
    if (!isByReference) {
      return (
        <p>
          <FormattedMessage
            id="discover.embeddable.missingDataView.viewModeWarningDescriptionEditableByValue"
            defaultMessage="<EditInDiscoverLink>Edit the session's configuration</EditInDiscoverLink> to fix it."
            values={{ EditInDiscoverLink: editInDiscoverLink }}
          />
        </p>
      );
    }

    // By reference in view mode
    if (!isEditMode) {
      return (
        <p>
          <FormattedMessage
            id="discover.embeddable.missingDataView.viewModeWarningDescriptionEditableByReference"
            defaultMessage="<EditInDiscoverLink>Go to the Discover session</EditInDiscoverLink> and select a valid data view for the tab displayed in this panel."
            values={{ EditInDiscoverLink: editInDiscoverLink }}
          />
        </p>
      );
    }

    // By reference in edit mode
    return (
      <p>
        <FormattedMessage
          id="discover.embeddable.missingDataView.editModeWarningDescriptionByReference"
          defaultMessage="Edit {editIcon} this panel to show a different tab or <EditInDiscoverLink>edit the Discover session</EditInDiscoverLink> to use a working data view."
          values={{
            editIcon: <EuiIcon aria-hidden={true} type="pencil" size="m" />,
            EditInDiscoverLink: editInDiscoverLink,
          }}
        />
      </p>
    );
  };

  return (
    <SavedSearchEmbeddableBase inlineEditing={inlineEditing} isLoading={false}>
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
            data-test-subj="discoverEmbeddableMissingDataViewCallout"
            icon={<EuiIcon aria-hidden={true} color="warning" size="xxl" type="warning" />}
            title={getTitle()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SavedSearchEmbeddableBase>
  );
};
