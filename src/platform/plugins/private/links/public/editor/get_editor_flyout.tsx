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

import type { SerializedTitles } from '@kbn/presentation-publishing';
import { apiPublishesSavedObjectId } from '@kbn/presentation-publishing';
import type { LinksLayoutType } from '../../common/content_management';
import { linksClient, runSaveToLibrary } from '../content_management';
import type { ResolvedLink } from '../types';
import LinksEditor, { type GeneralSettings } from '../components/editor/links_editor';
import { serializeResolvedLinks } from '../lib/resolve_links';

export interface EditorState {
  description?: string;
  hideBorder?: boolean;
  hideTitle?: boolean;
  layout?: LinksLayoutType;
  links?: ResolvedLink[];
  panelDefaultDescription?: string;
  panelDefaultTitle?: string;
  refId?: string;
  title?: string;
  error?: Error;
}



type InitialStateWithSerializedTitles = EditorState & Partial<SerializedTitles>;

function pickGeneralFromInitial(initial?: InitialStateWithSerializedTitles): GeneralSettings {
  return {
    title: initial?.title,
    description: initial?.description,
    hideTitle: initial?.hideTitle ?? initial?.hide_title,
    hideBorder: initial?.hideBorder ?? initial?.hide_border,
  };
}

/** Values used for "Reset to default" in General settings */
function pickTitleDefaultsForReset(initial?: InitialStateWithSerializedTitles) {
  return {
    defaultTitleForReset: initial?.panelDefaultTitle ?? initial?.title,
    defaultDescriptionForReset: initial?.panelDefaultDescription ?? initial?.description,
  };
}

export function getEditorFlyout({
  initialState,
  parentDashboard,
  onCompleteEdit,
  closeFlyout,
}: {
  initialState?: InitialStateWithSerializedTitles;
  parentDashboard?: unknown;
  onCompleteEdit?: (newState?: EditorState) => void;
  closeFlyout: () => void;
}) {
  const flyoutId = `linksEditorFlyout-${uuidv4()}`;
  const initialGeneral = pickGeneralFromInitial(initialState);
  const initialDefaults = pickTitleDefaultsForReset(initialState);

  return (
    <LinksEditor
      flyoutId={flyoutId}
      initialLinks={initialState?.links}
      initialLayout={initialState?.layout}
      initialTitle={initialGeneral.title ?? ''}
      initialDescription={initialGeneral.description ?? ''}
      initialHideTitle={initialGeneral.hideTitle ?? false}
      initialHideBorder={initialGeneral.hideBorder ?? false}
      defaultTitleForReset={initialDefaults.defaultTitleForReset}
      defaultDescriptionForReset={initialDefaults.defaultDescriptionForReset}
      onClose={() => {
        onCompleteEdit?.(undefined);
        closeFlyout();
      }}
      onSaveToLibrary={async (
        newLinks: ResolvedLink[],
        newLayout: LinksLayoutType,
        generalSettings: GeneralSettings
      ) => {
        const newState: EditorState = {
          ...initialState,
          links: newLinks,
          layout: newLayout,
          ...generalSettings,
        };
        if (initialState?.refId) {
          await linksClient.update({
            id: initialState.refId,
            data: {
              title: generalSettings.title,
              description: generalSettings.description,
              hide_title: generalSettings.hideTitle,
              hide_border: generalSettings.hideBorder,
              layout: newLayout,
              links: serializeResolvedLinks(newLinks),
            },
          });
          onCompleteEdit?.(newState);
          closeFlyout();
        } else {
          const saveResult = await runSaveToLibrary(newState);
          if (saveResult?.error) throw saveResult.error;
          onCompleteEdit?.(saveResult);
          // If saveResult is undefined, the user cancelled the save as modal and we should not close the flyout
          if (saveResult) closeFlyout();
        }
      }}
      onAddToDashboard={(
        newLinks: ResolvedLink[],
        newLayout: LinksLayoutType,
        generalSettings: GeneralSettings
      ) => {
        const newState: EditorState = {
          ...initialState,
          links: newLinks,
          layout: newLayout,
          ...generalSettings,
        };
        onCompleteEdit?.(newState);
        closeFlyout();
      }}
      parentDashboardId={
        parentDashboard && apiPublishesSavedObjectId(parentDashboard)
          ? parentDashboard.savedObjectId$.value
          : undefined
      }
      isByReference={Boolean(initialState?.refId)}
    />
  );
}
