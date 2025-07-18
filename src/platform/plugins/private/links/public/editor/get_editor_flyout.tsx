/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import { apiPublishesSavedObjectId } from '@kbn/presentation-publishing';
import { LinksLayoutType } from '../../common/content_management';
import { linksClient, runSaveToLibrary } from '../content_management';
import { ResolvedLink } from '../types';
import LinksEditor from '../components/editor/links_editor';
import { serializeResolvedLinks } from '../lib/resolve_links';

export interface EditorState {
  description?: string;
  layout?: LinksLayoutType;
  links?: ResolvedLink[];
  savedObjectId?: string;
  title?: string;
}

export async function getEditorFlyout({
  initialState,
  parentDashboard,
  onCompleteEdit,
  closeFlyout,
}: {
  initialState?: EditorState;
  parentDashboard?: unknown;
  onCompleteEdit?: (state?: EditorState) => void;
  closeFlyout: () => void;
}) {
  const flyoutId = `linksEditorFlyout-${uuidv4()}`;
  return (
    <LinksEditor
      flyoutId={flyoutId}
      initialLinks={initialState?.links}
      initialLayout={initialState?.layout}
      onClose={() => {
        onCompleteEdit?.(undefined);
        closeFlyout();
      }}
      onSaveToLibrary={async (newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
        const newState: EditorState = {
          ...initialState,
          layout: newLayout,
          links: newLinks,
        };
        if (initialState?.savedObjectId) {
          await linksClient.update({
            id: initialState.savedObjectId,
            data: {
              ...newState,
              links: serializeResolvedLinks(newLinks),
            },
          });
          onCompleteEdit?.(newState);
          closeFlyout();
        } else {
          const saveResult = await runSaveToLibrary({
            layout: newLayout,
            links: newLinks,
          });
          onCompleteEdit?.(saveResult);
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
        onCompleteEdit?.(newState);
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
}
