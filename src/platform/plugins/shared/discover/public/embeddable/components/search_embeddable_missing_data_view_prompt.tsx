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
import { isObject } from 'lodash';
import type { InlineEditingProps } from './saved_search_grid';
import { InlineEditFooter } from './inline_edit_footer';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';

interface SearchEmbeddableMissingDataViewPromptProps {
  api: { parentApi?: unknown };
  canShowDashboardWriteControls: boolean;
  inlineEditing: InlineEditingProps;
  onEditInDiscover?: () => Promise<void>;
}

const apiPublishesIsEditableByUser = (
  parentApi: unknown
): parentApi is { isEditableByUser: boolean } =>
  isObject(parentApi) &&
  typeof (parentApi as { isEditableByUser?: boolean }).isEditableByUser === 'boolean';

export const SearchEmbeddableMissingDataViewPrompt = ({
  api,
  canShowDashboardWriteControls,
  inlineEditing,
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

  const title = (
    <h2>
      <FormattedMessage
        id="discover.embeddable.missingDataView.warningTitle"
        defaultMessage="Couldn't find the data view associated with this Discover session tab"
      />
    </h2>
  );

  const getBody = () => {
    if (!isEditMode) {
      return canEditPanelInViewMode ? (
        <p>
          <FormattedMessage
            id="discover.embeddable.missingDataView.viewModeWarningDescriptionEditable"
            defaultMessage="<EditInDiscoverLink>Go to the Discover session</EditInDiscoverLink> and select a valid data view for the tab displayed in this panel"
            values={{
              EditInDiscoverLink: (chunks: React.ReactNode) => (
                <EuiLink
                  data-test-subj="discoverEmbeddableMissingDataViewEditInDiscoverLink"
                  onClick={() => void onEditInDiscover?.()}
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
            id="discover.embeddable.missingDataView.viewModeWarningDescriptionReadOnly"
            defaultMessage="Contact one of the dashboard's authors or Discover session owners to fix it"
          />
        </p>
      );
    }

    if (inlineEditing.isActive) {
      return (
        <p>
          <FormattedMessage
            id="discover.embeddable.missingDataView.editModeWarningDescription"
            defaultMessage="Edit {editIcon} this panel to show a different tab or <EditInDiscoverLink>edit the Discover session</EditInDiscoverLink> to use a working data view."
            values={{
              editIcon: <EuiIcon aria-hidden={true} type="pencil" size="m" />,
              EditInDiscoverLink: (chunks: React.ReactNode) => (
                <EuiLink
                  data-test-subj="discoverEmbeddableMissingDataViewEditInDiscoverLink"
                  onClick={() => void onEditInDiscover?.()}
                >
                  {chunks}
                </EuiLink>
              ),
            }}
          />
        </p>
      );
    }

    return (
      <p>
        <FormattedMessage
          id="discover.embeddable.missingDataView.editModePreEditWarningDescription"
          defaultMessage="Edit {editIcon} this panel to show a different tab or <EditInDiscoverLink>edit the Discover session</EditInDiscoverLink> to use a working data view."
          values={{
            editIcon: <EuiIcon aria-hidden={true} type="pencil" size="m" />,
            EditInDiscoverLink: (chunks: React.ReactNode) => (
              <EuiLink
                data-test-subj="discoverEmbeddableMissingDataViewEditInDiscoverLink"
                onClick={() => void onEditInDiscover?.()}
              >
                {chunks}
              </EuiLink>
            ),
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
            data-test-subj="discoverEmbeddableMissingDataViewCallout"
            icon={<EuiIcon aria-hidden={true} color="warning" size="xxl" type="warning" />}
            title={title}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SavedSearchEmbeddableBase>
  );
};
