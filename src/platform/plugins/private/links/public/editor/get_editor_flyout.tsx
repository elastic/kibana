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
import LinksEditor, { LinksEditorProps } from '../components/editor/links_editor';
import { serializeResolvedLinks } from '../lib/resolve_links';

export async function getEditorFlyout({
  initialLayout,
  initialLinks,
  savedObjectId,
  parentDashboard,
  onCompleteEdit,
  closeFlyout,
}: {
  initialLayout?: LinksEditorProps['initialLayout'];
  initialLinks?: LinksEditorProps['initialLinks'];
  savedObjectId?: string;
  parentDashboard?: unknown;
  onCompleteEdit?: (newState?: {
    layout?: LinksLayoutType;
    links?: ResolvedLink[];
    savedObjectId?: string;
    title?: string;
  }) => void;
  closeFlyout: () => void;
}) {
  const flyoutId = `linksEditorFlyout-${uuidv4()}`;
  return (
    <LinksEditor
      flyoutId={flyoutId}
      initialLinks={initialLinks}
      initialLayout={initialLayout}
      onClose={() => {
        onCompleteEdit?.(undefined);
        closeFlyout();
      }}
      onSaveToLibrary={async (newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
        if (savedObjectId) {
          await linksClient.update({
            id: savedObjectId,
            data: {
              layout: newLayout,
              links: serializeResolvedLinks(newLinks),
            },
          });
          onCompleteEdit?.({
            layout: newLayout,
            links: newLinks,
            savedObjectId,
          });
          closeFlyout();
        } else {
          const saveResult = await runSaveToLibrary({
            layout: newLayout,
            links: newLinks,
          });
          onCompleteEdit?.(
            saveResult
              ? {
                  layout: newLayout,
                  links: newLinks,
                  savedObjectId: saveResult.savedObjectId,
                }
              : undefined
          );
          // If saveResult is undefined, the user cancelled the save as modal and we should not close the flyout
          if (saveResult) closeFlyout();
        }
      }}
      onAddToDashboard={(newLinks: ResolvedLink[], newLayout: LinksLayoutType) => {
        onCompleteEdit?.({
          links: newLinks,
          layout: newLayout,
        });
        closeFlyout();
      }}
      parentDashboardId={
        parentDashboard && apiPublishesSavedObjectId(parentDashboard)
          ? parentDashboard.savedObjectId$.value
          : undefined
      }
      isByReference={Boolean(savedObjectId)}
    />
  );
}
