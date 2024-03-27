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
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { withSuspense } from '@kbn/shared-ux-utility';

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { tracksOverlays } from '@kbn/presentation-containers';
import { Link, LinksLayoutType } from '../../common/content_management';
import { runSaveToLibrary } from '../content_management/save_to_library';
import { LinksByReferenceInput, LinksEditorFlyoutReturn, LinksInput } from '../embeddable/types';
import { getLinksAttributeService } from '../services/attribute_service';
import { coreServices } from '../services/kibana_services';

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
export async function openEditorFlyout(
  initialInput: LinksInput,
  parentDashboard?: DashboardContainer
): Promise<LinksEditorFlyoutReturn> {
  const attributeService = getLinksAttributeService();
  const { attributes } = await attributeService.unwrapAttributes(initialInput);
  const isByReference = attributeService.inputIsRefType(initialInput);
  const initialLinks = attributes?.links;
  const overlayTracker =
    parentDashboard && tracksOverlays(parentDashboard) ? parentDashboard : undefined;

  if (!initialLinks) {
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

    const onSaveToLibrary = async (newLinks: Link[], newLayout: LinksLayoutType) => {
      const newAttributes = {
        ...attributes,
        links: newLinks,
        layout: newLayout,
      };
      const updatedInput = (initialInput as LinksByReferenceInput).savedObjectId
        ? await attributeService.wrapAttributes(newAttributes, true, initialInput)
        : await runSaveToLibrary(newAttributes, initialInput);
      if (!updatedInput) {
        return;
      }
      resolve({
        newInput: updatedInput,

        // pass attributes via attributes so that the Dashboard can choose the right panel size.
        attributes: newAttributes,
      });
      parentDashboard?.reload();
      closeEditorFlyout(editorFlyout);
    };

    const onAddToDashboard = (newLinks: Link[], newLayout: LinksLayoutType) => {
      const newAttributes = {
        ...attributes,
        links: newLinks,
        layout: newLayout,
      };
      const newInput: LinksInput = {
        ...initialInput,
        attributes: newAttributes,
      };
      resolve({
        newInput,

        // pass attributes so that the Dashboard can choose the right panel size.
        attributes: newAttributes,
      });
      parentDashboard?.reload();
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
          initialLinks={initialLinks}
          initialLayout={attributes?.layout}
          onClose={onCancel}
          onSaveToLibrary={onSaveToLibrary}
          onAddToDashboard={onAddToDashboard}
          parentDashboard={parentDashboard}
          isByReference={isByReference}
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
