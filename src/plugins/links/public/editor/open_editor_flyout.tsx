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
import { BehaviorSubject } from 'rxjs';
import { LinksAttributes, LinksLayoutType } from '../../common/content_management';
import { runSaveToLibrary } from '../content_management/save_to_library';
import { LinksEditorFlyoutReturn } from '../embeddable/types';
import { coreServices } from '../services/kibana_services';
import { LinksSerializedState, ResolvedLink } from '../react_embeddable/types';
import { getLinksAttributeService } from '../services/attribute_service';
import { resolveLinks } from '../react_embeddable/utils';

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
  resolvedLinks$,
  attributes$,
  savedObjectId$,
}: {
  initialState?: LinksSerializedState;
  parentDashboard?: unknown;
  resolvedLinks$?: BehaviorSubject<ResolvedLink[]>;
  attributes$?: BehaviorSubject<LinksAttributes>;
  savedObjectId$?: BehaviorSubject<string | undefined>;
}): Promise<LinksEditorFlyoutReturn> {
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
  const attributeService = getLinksAttributeService();
  const { attributes } = initialState ? await attributeService.unwrapAttributes(initialState) : {};
  const isByReference = Boolean(initialState?.savedObjectId);

  const resolvedLinks = resolvedLinks$?.getValue() ?? (await resolveLinks(attributes?.links));

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
      // remove the title and description state from the resolved links before saving
      const links = newLinks.map(({ title, description, ...linkToSave }) => linkToSave);
      const newAttributes = {
        ...attributes,
        links,
        layout: newLayout,
      };
      const savedAttributes = initialState?.savedObjectId
        ? await attributeService.wrapAttributes(newAttributes, true)
        : await runSaveToLibrary(newAttributes, initialState);
      savedObjectId$?.next(savedAttributes?.savedObjectId);
      resolvedLinks$?.next(newLinks);
      attributes$?.next(newAttributes);
      resolve(savedAttributes);
      closeEditorFlyout(editorFlyout);
    };

    const onAddToDashboard = (newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
      // remove the title and description state from the resolved links before saving
      const links = newLinks.map(({ title, description, ...linkToSave }) => linkToSave);
      const newAttributes = {
        ...attributes,
        links,
        layout: newLayout,
      };
      const newState = {
        ...initialState,
        attributes: {
          ...initialState?.attributes,
          ...newAttributes,
        },
      };
      resolvedLinks$?.next(newLinks);
      attributes$?.next(newAttributes);
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
          initialLinks={resolvedLinks}
          initialLayout={attributes?.layout}
          onClose={onCancel}
          onSaveToLibrary={onSaveToLibrary}
          onAddToDashboard={onAddToDashboard}
          parentDashboardId={parentDashboardId}
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
