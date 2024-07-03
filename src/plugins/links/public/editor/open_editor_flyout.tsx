/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { skip, take } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { withSuspense } from '@kbn/shared-ux-utility';

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiPublishesSavedObjectId } from '@kbn/presentation-publishing';
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
}: {
  initialState?: LinksRuntimeState;
  parentDashboard?: unknown;
}): Promise<LinksRuntimeState | undefined> {
  if (!initialState) {
    /**
     * When creating a new links panel, the tooltip from the "Add panel" popover interacts badly with the flyout
     * and can cause a "double opening" animation if the flyout opens before the tooltip has time to unmount; so,
     * when creating a new links panel, we need to slow down the process a little bit so that the tooltip has time
     * to disappear before we try to open the flyout.
     *
     * This does not apply to editing existing links panels, since there is no tooltip for this action.
     */
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const overlayTracker =
    parentDashboard && tracksOverlays(parentDashboard) ? parentDashboard : undefined;

  const parentDashboardId =
    parentDashboard && apiPublishesSavedObjectId(parentDashboard)
      ? parentDashboard.savedObjectId.value
      : undefined;

  return new Promise((resolve, reject) => {
    const flyoutId = `linksEditorFlyout-${uuidv4()}`;

    const closeEditorFlyout = (editorFlyout: OverlayRef) => {
      if (overlayTracker) {
        overlayTracker.clearOverlays();
      } else {
        editorFlyout.close();
      }
    };

    /**
     * Close the flyout whenever the app changes - this handles cases for when the flyout is open outside of the
     * Dashboard app (`overlayTracker` is not available)
     */
    coreServices.application.currentAppId$.pipe(skip(1), take(1)).subscribe(() => {
      if (!overlayTracker) editorFlyout.close();
    });

    const onSaveToLibrary = async (newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
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
        resolve(newState);
      } else {
        const saveResult = await runSaveToLibrary(newState);
        resolve(saveResult);
      }
      closeEditorFlyout(editorFlyout);
    };

    const onAddToDashboard = (newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
      const newState = {
        ...initialState,
        links: newLinks,
        layout: newLayout,
      };
      resolve(newState);
      closeEditorFlyout(editorFlyout);
    };

    const onCancel = () => {
      reject();
      closeEditorFlyout(editorFlyout);
    };

    const editorFlyout = coreServices.overlays.openFlyout(
      toMountPoint(
        <LinksEditor
          flyoutId={flyoutId}
          initialLinks={initialState?.links}
          initialLayout={initialState?.layout}
          onClose={onCancel}
          onSaveToLibrary={onSaveToLibrary}
          onAddToDashboard={onAddToDashboard}
          parentDashboardId={parentDashboardId}
          isByReference={Boolean(initialState?.savedObjectId)}
        />,
        { theme: coreServices.theme, i18n: coreServices.i18n }
      ),
      {
        id: flyoutId,
        maxWidth: 720,
        ownFocus: true,
        onClose: onCancel,
        outsideClickCloses: false,
        className: 'linksPanelEditor',
        'data-test-subj': 'links--panelEditor--flyout',
      }
    );

    if (overlayTracker) {
      overlayTracker.openOverlay(editorFlyout);
    }
  });
}
