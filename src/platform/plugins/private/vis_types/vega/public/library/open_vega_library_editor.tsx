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
import { openLazySystemFlyout } from '@kbn/presentation-util';
import type { VegaPluginStartDependencies } from '../plugin';
import { vegaTitleInWizard } from '../vega_icon';
import { createVegaLibraryClient } from './vega_library_client';

/**
 * Opens the editor for a Vega library item, or for a new item when `id` is omitted. Resolves when
 * the editor closes.
 */
export const openVegaLibraryEditor = async ({
  core,
  deps,
  id,
}: {
  core: CoreStart;
  deps: Pick<VegaPluginStartDependencies, 'dataViews' | 'unifiedSearch' | 'savedObjectsTaggingOss'>;
  id?: string;
}): Promise<void> => {
  const client = createVegaLibraryClient(core.http);

  const flyoutRef = openLazySystemFlyout({
    core,
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
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      const [item, defaultDataView, { VegaLibraryEditor }] = await Promise.all([
        id ? client.get(id).then(({ data }) => ({ id, data })) : undefined,
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
          closeFlyout={closeFlyout}
          ariaLabelledBy={ariaLabelledBy}
        />
      );
    },
  });

  await flyoutRef.onClose;
};
