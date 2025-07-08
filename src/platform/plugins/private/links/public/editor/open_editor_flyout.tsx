/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { skip, take } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';

import { apiPublishesSavedObjectId } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-utils';
import { LinksLayoutType } from '../../common/content_management';
import { linksClient, runSaveToLibrary } from '../content_management';
import { coreServices } from '../services/kibana_services';
import { LinksRuntimeState, ResolvedLink } from '../types';
import { serializeLinksAttributes } from '../lib/serialize_attributes';

const LazyLinksEditor = React.lazy(() => import('../components/editor/links_editor'));

const LinksEditor = withSuspense(
  LazyLinksEditor,
  <EuiPanel className="eui-textCenter">
    <EuiLoadingSpinner size="l" />
  </EuiPanel>
);

/**
 * @throws in case user cancels
 */
export async function openEditorFlyout({
  initialState,
  parentDashboard,
  onConfirm,
}: {
  initialState?: LinksRuntimeState;
  parentDashboard?: unknown;
  onConfirm?: (newState?: LinksRuntimeState) => void;
}) {
  const flyoutId = `linksEditorFlyout-${uuidv4()}`;

  openLazyFlyout({
    core: coreServices,
    parentApi: parentDashboard,
    loadContent: async ({ closeFlyout }) => {
      /**
       * Close the flyout whenever the app changes - this handles cases for when the flyout is open outside of the
       * Dashboard app (`overlayTracker` is not available)
       */
      coreServices.application.currentAppId$.pipe(skip(1), take(1)).subscribe(() => {
        closeFlyout();
      });
      return (
        <LinksEditor
          flyoutId={flyoutId}
          initialLinks={initialState?.links}
          initialLayout={initialState?.layout}
          onClose={() => {
            onConfirm?.(undefined);
            closeFlyout();
          }}
          onSaveToLibrary={async (newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
            const newState: LinksRuntimeState = {
              ...initialState,
              links: newLinks,
              layout: newLayout,
            };

            if (initialState?.savedObjectId) {
              const { attributes, references } = serializeLinksAttributes(newState);
              await linksClient.update({
                id: initialState.savedObjectId,
                data: attributes,
                options: { references },
              });
              onConfirm?.(newState);
              closeFlyout();
            } else {
              const saveResult = await runSaveToLibrary(newState);
              onConfirm?.(saveResult);
              // If saveResult is undefined, the user cancelled the save as modal and we should not close the flyout
              if (saveResult) closeFlyout();
            }
          }}
          onAddToDashboard={(newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
            const newState = {
              ...initialState,
              links: newLinks,
              layout: newLayout,
            };
            onConfirm?.(newState);
            closeFlyout();
          }}
          parentDashboardId={
            parentDashboard && apiPublishesSavedObjectId(parentDashboard)
              ? parentDashboard.savedObjectId$.value
              : undefined
          }
          isByReference={Boolean(initialState?.savedObjectId)}
        />
      );
    },
    flyoutProps: {
      id: flyoutId,
      'data-test-subj': 'links--panelEditor--flyout',
    },
  });
}
