/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { openLazyFlyout } from '@kbn/presentation-util';
import { loadFromLibrary } from '../content_management/load_from_library';
import { getEditorFlyout } from './get_editor_flyout';
import { resolveLinks } from '../lib/resolve_links';
import { coreServices } from '../services/kibana_services';
import type { LinksState } from '../../server';

export async function onVisualizationsEdit(savedObjectId: string) {
  openLazyFlyout({
    core: coreServices,
    loadContent: async ({ closeFlyout }) => {
      let linksState: LinksState | undefined;
      try {
        linksState = await loadFromLibrary(savedObjectId);
      } catch (error) {
        coreServices.notifications.toasts.addWarning(error.message);
        return;
      }

      return getEditorFlyout({
        initialState: {
          savedObjectId,
          ...linksState,
          links: await resolveLinks(linksState.links ?? []),
        },
        closeFlyout,
      });
    },
    flyoutProps: {
      'data-test-subj': 'links--panelEditor--flyout',
    },
  });
}
