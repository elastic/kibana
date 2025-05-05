/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import {
  SavedObjectFinder,
  SavedObjectFinderProps,
  type SavedObjectMetaData,
} from '@kbn/saved-objects-finder-plugin/public';

import { METRIC_TYPE } from '@kbn/analytics';
import { apiHasType } from '@kbn/presentation-publishing';
import { CanAddNewPanel } from '@kbn/presentation-containers';
import {
  core,
  savedObjectsTaggingOss,
  contentManagement,
  usageCollection,
} from '../kibana_services';
import { getAddFromLibraryType, useAddFromLibraryTypes } from './registry';

const runAddTelemetry = (
  parent: unknown,
  savedObject: SavedObjectCommon,
  savedObjectMetaData: SavedObjectMetaData
) => {
  if (!apiHasType(parent)) return;
  const type = savedObjectMetaData.getSavedObjectSubType
    ? savedObjectMetaData.getSavedObjectSubType(savedObject)
    : savedObjectMetaData.type;

  usageCollection?.reportUiCounter?.(parent.type, METRIC_TYPE.CLICK, `${type}:add`);
};

export const AddFromLibraryFlyout = ({
  container,
  modalTitleId,
}: {
  container: CanAddNewPanel;
  modalTitleId?: string;
}) => {
  const libraryTypes = useAddFromLibraryTypes();

  const onChoose: SavedObjectFinderProps['onChoose'] = useCallback(
    async (
      id: SavedObjectCommon['id'],
      type: SavedObjectCommon['type'],
      name: string,
      savedObject: SavedObjectCommon
    ) => {
      const libraryType = getAddFromLibraryType(type);
      if (!libraryType) {
        core.notifications.toasts.addWarning(
          i18n.translate('embeddableApi.addPanel.typeNotFound', {
            defaultMessage: 'Unable to load type: {type}',
            values: { type },
          })
        );
        return;
      }

      // This is a working code but not a final implementation.
      // The logic here doesn't make use of existing project utilities or helpers that might already handle scrolling or dashboard updates.
      // It relies on direct DOM querying and assumptions about panel order (e.g., newly added panel is second-to-last).
      //
      // Panel rendering is asynchronous — there's a delay between triggering the addition and when the panel appears in the DOM,
      // which is why scroll logic based on direct DOM access had to be wrapped in a MutationObserver.
      //
      // Please review especially the following:
      // - Is this the correct place in the flow to trigger the success toast?
      // - Is the approach to i18n (translation strings and value interpolation) acceptable -further questions below
      // - Should this scroll behavior be replaced with an existing helper, like `scrollToPanelId` from `useDashboardApi()`?
      // - Is there a better way to handle timing or async detection of the new panel being rendered before scrolling?

      // Wrapped in try-catch to ensure that adding the panel completes successfully.
      try {
        libraryType.onAdd(container, savedObject);
        runAddTelemetry(container, savedObject, libraryType.savedObjectMetaData);

        // Currently, scrolling is based on the universal name of the parent container - kbnGridRow
        // It is assumed that the newly added panel will always be the second-to-last one in the list.
        // Or, should we scroll by the panel's ID? If so, how should we identify the panel to scroll to?
        // Note: the `id` available in the add_from_library_flyout.tsx refers to the saved object,
        // but the actual DOM element in `dashboard_grid_item.tsx` file uses a different ID.

        // Also noticed that `useDashboardApi()` provides utility methods like `scrollToPanel`, scrollToPanelId
        // These might be more appropriate for scrolling to a newly added panel, but I haven't yet analyzed how to use them in this context.
        // Note: Panels are added to the dashboard with a delay, so attempting to scroll in AddFromLibrary may not find the panel in the DOM at the time of execution.
        const parentElement = document.querySelector('[id^="kbnGridRow"]');
        if (parentElement) {
          const observer = new MutationObserver(() => {
            const children = parentElement.children;

            if (children.length > 1) {
              const secondLastChild = children[children.length - 2];
              secondLastChild.scrollIntoView({ behavior: 'smooth' });
            }
          });
          observer.observe(parentElement, {
            childList: true,
          });
        }
        // Is this the correct place to trigger a notification?
        // How should translation be handled (e.g., which file should the message be in)?
        // Is the message already existing, or should a new one be created as a default message?
        core.notifications.toasts.addSuccess(
          i18n.translate('dashboard.panel.addFromLibrary.successMessage', {
            defaultMessage: 'The panel "{name}" was successfully added to the dashboard.',
            values: { name },
          })
        );
      } catch (error) {
        core.notifications.toasts.addError(error, {
          title: i18n.translate('dashboard.panel.addFromLibrary.failureMessage', {
            defaultMessage: 'Failed to add panel "{name}" to the dashboard.',
            values: { name },
          }),
        });
      }
    },
    [container]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={modalTitleId}>
            {i18n.translate('embeddableApi.addPanel.Title', { defaultMessage: 'Add from library' })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinder
          id="embeddableAddPanel"
          services={{
            contentClient: contentManagement.client,
            savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
            uiSettings: core.uiSettings,
          }}
          onChoose={onChoose}
          savedObjectMetaData={libraryTypes}
          showFilter={true}
          noItemsMessage={i18n.translate('embeddableApi.addPanel.noMatchingObjectsMessage', {
            defaultMessage: 'No matching objects found.',
          })}
          getTooltipText={(item) => {
            return item.managed
              ? i18n.translate('embeddableApi.addPanel.managedPanelTooltip', {
                  defaultMessage:
                    'Elastic manages this panel. Adding it to a dashboard unlinks it from the library.',
                })
              : undefined;
          }}
        />
      </EuiFlyoutBody>
    </>
  );
};
