/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { firstValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddableEditorBreadcrumb, EmbeddableStart } from '@kbn/embeddable-plugin/public';

export interface UseNavigateToLensParams {
  core: CoreStart;
  embeddable: EmbeddableStart;
}

/**
 * Title of the Annotation Groups tab inside the Visualize landing page.
 */
export const ANNOTATION_GROUPS_TAB_TITLE = i18n.translate(
  'eventAnnotationListing.listingViewTitle',
  { defaultMessage: 'Annotation groups' }
);

/**
 * Returns an async callback that hands off to the Lens editor via the
 * embeddable plugin's state transfer, with breadcrumbs that point back to
 * the currently mounted app and the Annotation Groups listing tab.
 *
 * Used by the listing's empty state CTA, where the only way to create a new
 * annotation group is to open Lens.
 */
export const useNavigateToLens = ({ core, embeddable }: UseNavigateToLensParams) => {
  return useCallback(async () => {
    const currentApp = await firstValueFrom(core.application.currentAppId$);
    if (!currentApp) {
      return;
    }
    const stateTransfer = embeddable.getStateTransfer();
    const breadcrumbs: EmbeddableEditorBreadcrumb[] = [
      {
        text: stateTransfer.getAppNameFromId(currentApp) ?? currentApp,
        href: core.application.getUrlForApp(currentApp),
      },
      {
        text: ANNOTATION_GROUPS_TAB_TITLE,
        href: core.application.getUrlForApp(currentApp, {
          path: window.location.hash,
        }),
      },
    ];
    await stateTransfer.navigateToEditor('lens', {
      path: '',
      state: {
        originatingApp: currentApp,
        originatingPath: window.location.hash,
        breadcrumbs,
      },
    });
  }, [core, embeddable]);
};
