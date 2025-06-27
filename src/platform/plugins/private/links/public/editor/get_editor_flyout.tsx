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

import { tracksOverlays } from '@kbn/presentation-containers';
import { apiPublishesSavedObjectId } from '@kbn/presentation-publishing';
import { LinksLayoutType } from '../../common/content_management';
import { linksClient, runSaveToLibrary } from '../content_management';
import { coreServices } from '../services/kibana_services';
import { LinksRuntimeState, ResolvedLink } from '../types';
import { serializeLinksAttributes } from '../lib/serialize_attributes';
import LinksEditor from '../components/editor/links_editor';

/**
 * @throws in case user cancels
 */
export async function getEditorFlyout({
  initialState,
  parentDashboard,
  closeFlyout,
  onSave,
}: {
  initialState?: LinksRuntimeState;
  parentDashboard?: unknown;
  onSave?: (newState?: LinksRuntimeState) => void;
  closeFlyout: () => void;
}) {
  const parentDashboardId =
    parentDashboard && apiPublishesSavedObjectId(parentDashboard)
      ? parentDashboard.savedObjectId$.value
      : undefined;

  const flyoutId = `linksEditorFlyout-${uuidv4()}`;

  /**
   * Close the flyout whenever the app changes - this handles cases for when the flyout is open outside of the
   * Dashboard app (`overlayTracker` is not available)
   */
  coreServices.application.currentAppId$.pipe(skip(1), take(1)).subscribe(() => {
    closeFlyout();
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
      await onSave?.(newState);
      closeFlyout();
    } else {
      const saveResult = await runSaveToLibrary(newState);
      await onSave?.(newState);
      // If saveResult is undefined, the user cancelled the save as modal and we should not close the flyout
      if (saveResult) closeFlyout();
    }
  };

  const onAddToDashboard = async (newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
    const newState = {
      ...initialState,
      links: newLinks,
      layout: newLayout,
    };
    await onSave?.(newState);
    closeFlyout();
  };

  const onCancel = async () => {
    await onSave?.(undefined);
    closeFlyout();
  };

  return (
    <LinksEditor
      flyoutId={flyoutId}
      initialLinks={initialState?.links}
      initialLayout={initialState?.layout}
      onClose={onCancel}
      onSaveToLibrary={onSaveToLibrary}
      onAddToDashboard={onAddToDashboard}
      parentDashboardId={parentDashboardId}
      isByReference={Boolean(initialState?.savedObjectId)}
    />
  );
}
