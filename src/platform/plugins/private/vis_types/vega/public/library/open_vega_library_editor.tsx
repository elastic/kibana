/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { openLazyFlyout, openLazySystemFlyout } from '@kbn/presentation-util';
import type { VegaEditableState } from '../lib/library_draft';
import type { VegaPluginStartDependencies } from '../plugin';
import { vegaTitleInWizard } from '../vega_icon';
import { createVegaLibraryClient } from './vega_library_client';

/**
 * Opens the editor for a Vega library item. Resolves when the editor closes.
 */
export const openVegaLibraryEditor = async ({
  core,
  deps,
  id,
  panel,
}: {
  core: CoreStart;
  deps: Pick<VegaPluginStartDependencies, 'dataViews' | 'unifiedSearch' | 'savedObjectsTaggingOss'>;
  id: string;
  /** The dashboard or Canvas panel being edited, which shows the preview instead of a flyout. */
  panel?: { parentApi: unknown; uuid: string; onPreview: (state: VegaEditableState) => void };
}): Promise<void> => {
  const client = createVegaLibraryClient(core.http);

  const loadContent = async ({
    closeFlyout,
    ariaLabelledBy,
  }: {
    closeFlyout: () => void;
    ariaLabelledBy: string;
  }) => {
    const [item, defaultDataView, { VegaLibraryEditor }] = await Promise.all([
      client.get(id).then(({ data }) => ({ id, data })),
      // A missing default data view shouldn't block editing.
      deps.dataViews.getDefault().catch((): null => null),
      import('./vega_library_editor'),
    ]);

    return (
      <VegaLibraryEditor
        core={core}
        client={client}
        SearchBar={deps.unifiedSearch.ui.SearchBar}
        savedObjectsTagging={deps.savedObjectsTaggingOss?.getTaggingApi()}
        item={item}
        defaultDataView={defaultDataView ?? undefined}
        canSave={Boolean(core.application.capabilities.visualize_v2?.save)}
        // A panel couldn't switch to a new copy of the item it references.
        allowSaveAsNew={!panel}
        onPreview={panel?.onPreview}
        closeFlyout={closeFlyout}
        ariaLabelledBy={ariaLabelledBy}
      />
    );
  };

  const flyoutRef = panel
    ? openLazyFlyout({
        core,
        parentApi: panel.parentApi,
        loadContent,
        flyoutProps: {
          // Placed like the by-value editor, next to the panel it previews in.
          focusedPanelId: panel.uuid,
          size: 'm',
          // A stray click would otherwise discard unsaved edits.
          outsideClickCloses: false,
          'data-test-subj': 'vegaLibraryEditorFlyout',
        },
      })
    : // A system flyout, so the preview can open beside the editor as a child flyout.
      openLazySystemFlyout({
        core,
        loadContent,
        flyoutProps: {
          // No `size`: the default width pairs with the size `m` preview flyout, while EUI doesn't
          // allow a parent and child flyout to both be `m`.
          title: vegaTitleInWizard,
          // The library page has no panel to push aside, so cover it like a dialog would.
          type: 'overlay',
          ownFocus: true,
          // A stray click would otherwise discard unsaved edits.
          outsideClickCloses: false,
          'data-test-subj': 'vegaLibraryEditorFlyout',
        },
      });

  await flyoutRef.onClose;
};
