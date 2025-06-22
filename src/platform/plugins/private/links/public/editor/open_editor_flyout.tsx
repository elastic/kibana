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

import { EuiFlyoutBody, EuiFlyoutHeader, EuiSkeletonText, EuiTitle } from '@elastic/eui';
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

// const FallbackComponent = (
//   <EuiPanel className="eui-textCenter">
//     <EuiLoadingSpinner size="l" />
//   </EuiPanel>
// );

const title = 'Create Links Panel';

const FallbackComponent = <>
<EuiFlyoutHeader hasBorder>
  <EuiTitle size="s">
    <h1 id="addPanelsFlyout">
      {title || 'Loading...' }
    </h1>
  </EuiTitle>
</EuiFlyoutHeader>
<EuiFlyoutBody>
  <EuiSkeletonText/>
</EuiFlyoutBody>
</>


const LinksEditor = withSuspense(
  LazyLinksEditor,
  FallbackComponent
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

  var t0 = performance.now();


  const overlayTracker =
    parentDashboard && tracksOverlays(parentDashboard) ? parentDashboard : undefined;

  const parentDashboardId =
    parentDashboard && apiPublishesSavedObjectId(parentDashboard)
      ? parentDashboard.savedObjectId$.value
      : undefined;


  const promiseResult = new Promise<LinksRuntimeState | undefined>((resolve) => {
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
        closeEditorFlyout(editorFlyout);
      } else {
        const saveResult = await runSaveToLibrary(newState);
        resolve(saveResult);
        // If saveResult is undefined, the user cancelled the save as modal and we should not close the flyout
        if (saveResult) closeEditorFlyout(editorFlyout);
      }
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
      resolve(undefined);
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
        coreServices
      ),
      {
        id: flyoutId,
        maxWidth: 500,
        paddingSize: 'm',
        ownFocus: true,
        onClose: onCancel,
        outsideClickCloses: false,
        'data-test-subj': 'links--panelEditor--flyout',
      }
    );
    var t1 = performance.now();
    console.log('THI5',t1 - t0);

    if (overlayTracker) {
      overlayTracker.openOverlay(editorFlyout);
    }
  });
  return promiseResult
}
