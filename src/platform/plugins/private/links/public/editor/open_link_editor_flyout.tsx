/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { getFlyoutManagerStore } from '@elastic/eui';
import { openLazySystemFlyout } from '@kbn/presentation-util';

import { LinkEditor } from '../components/editor/link_editor';
import { LinksStrings } from '../components/links_strings';
import { coreServices } from '../services/kibana_services';
import type { ResolvedLink } from '../types';

export interface LinkEditorProps {
  link?: ResolvedLink;
  parentDashboardId?: string;
  historyKey: symbol;
}

/**
 * Opens the link editor as a managed EUI flyout in the same history group as the panel editor.
 * EUI provides the back button, animation, focus trap, and focus restoration automatically.
 *
 * IMPORTANT: Save and Cancel navigate back via `goBack()` rather than calling `closeFlyout()`
 * directly. Calling `closeFlyout()` (which calls `unmountComponentAtNode`) while the sub-editor is
 * still registered in the EUI flyout manager store triggers the manager's `useLayoutEffect` cleanup
 * to call `closeAllFlyouts()`, which would close the panel editor too. `goBack()` removes the
 * sub-editor from the store first, so by the time React unmounts the component the store check
 * (`stillInStore`) is false and no cascade close fires.
 *
 * The X button is hidden via `flyoutMenuProps.hideCloseButton` because EUI's managed flyout X
 * button hardcodes `closeAllFlyouts()` for LEVEL_MAIN sessions and cannot be redirected to
 * `goBack()`. Users navigate back via the EUI back button (labeled with the panel editor title)
 * or the Cancel button in the footer.
 */
export async function openLinkEditorFlyout({
  link,
  historyKey,
  parentDashboardId,
}: LinkEditorProps) {
  return new Promise<ResolvedLink | undefined>((resolve) => {
    const flyoutRef = openLazySystemFlyout({
      core: coreServices,
      loadContent: async () => (
        <LinkEditor
          link={link}
          parentDashboardId={parentDashboardId}
          onSave={(newLink) => {
            resolve(newLink);
            getFlyoutManagerStore().goBack();
          }}
          onClose={() => getFlyoutManagerStore().goBack()}
        />
      ),
      flyoutProps: {
        historyKey,
        title: link
          ? LinksStrings.editor.getEditLinkTitle()
          : LinksStrings.editor.getAddButtonLabel(),
        flyoutMenuProps: { hideCloseButton: true },
      },
    });
    // Resolves when the EUI back button, a cascade close, or goBack() fires onClose.
    // Promise settles only once, so this is a no-op after a successful save.
    flyoutRef.onClose.then(() => resolve(undefined));
  });
}
