/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { openLazySystemFlyout } from '@kbn/presentation-util';
import type { LinksByValueState } from '../../server';
import { LinksStrings } from '../components/links_strings';
import { loadFromLibrary } from '../links_client/load_from_library';
import { resolveLinks } from '../lib/resolve_links';
import { coreServices } from '../services/kibana_services';

export async function onVisualizationsEdit(refId: string) {
  openLazySystemFlyout({
    core: coreServices,
    loadContent: async ({ closeFlyout }) => {
      let linksState: LinksByValueState | undefined;
      try {
        linksState = await loadFromLibrary(refId);
      } catch (error) {
        coreServices.notifications.toasts.addWarning(error.message);
        return;
      }

      const { LinksLibraryEditor } = await import('./links_library_editor');
      return React.createElement(LinksLibraryEditor, {
        initialState: {
          refId,
          ...linksState,
          links: await resolveLinks(linksState.links ?? []),
        },
        closeFlyout,
      });
    },
    flyoutProps: {
      'data-test-subj': 'links--panelEditor--flyout',
      title: LinksStrings.editor.panelEditor.getEditFlyoutTitle(),
    },
  });
}
