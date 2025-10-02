/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { CoreStart, OverlayFlyoutOpenOptions } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { skip, take } from 'rxjs';
import { focusFirstFocusable } from './focus_helpers';
import { LoadingFlyout } from './loading_flyout';
import { tracksOverlays } from './tracks_overlays';

interface LoadContentArgs {
  closeFlyout: () => void;
}

interface OpenLazyFlyoutParams {
  core: CoreStart;
  parentApi?: unknown;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
  /**
   * Title of the flyout to use in the top menu bar and for the aria-label.
   */
  flyoutTitle: string | Promise<string>;
  flyoutProps?: Partial<OverlayFlyoutOpenOptions> & { triggerId?: string; focusedPanelId?: string };
}

/**
 * Opens a flyout panel with lazily loaded content.
 *
 * This helper handles:
 * - Mounting a flyout panel with async content.
 * - Automatically focusing the flyout when content is ready.
 * - Closing the flyout when the user navigates to a different app.
 * - Tracking the flyout if `parentApi` supports overlay tracking.
 * - Returning focus to a trigger element when the flyout closes.
 *
 * @param params - Configuration object.
 * @param params.core - The `CoreStart` contract, used for overlays, app lifecycle, and notifications.
 * @param params.loadContent - Async function that loads the flyout content. Must return a valid React element.
 *                             If it resolves to `null` or `undefined`, the flyout will close automatically.
 * @param params.flyoutProps - Optional props passed to `openFlyout` (e.g. size, className, etc).
 *                             Supports `OverlayFlyoutOpenOptions`.
 * @param params.title - Title for the flyout, used for flyout top menu and aria-label.
 * @param params.parentApi - Optional parent API to track opened overlays (e.g. dashboardsApi).
 *
 * @returns A handle to the opened flyout (`OverlayRef`).
 */
export const openLazyFlyout = (params: OpenLazyFlyoutParams) => {
  const { core, parentApi, loadContent, flyoutTitle: _title, flyoutProps: allFlyoutProps } = params;

  let flyoutTitle = _title;
  if (!flyoutTitle) {
    flyoutTitle = 'Lazy Flyout';
  }

  const { focusedPanelId, triggerId, ...flyoutProps } = allFlyoutProps ?? {};

  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  const onClose = () => {
    overlayTracker?.clearOverlays();
    flyoutRef?.close();
    if (triggerId) {
      focusFirstFocusable(document.getElementById(triggerId));
    }
  };

  /**
   * Close the flyout whenever the app changes - this handles cases for when the flyout is open outside of the
   * Dashboard app (`overlayTracker` is not available)
   */
  core.application.currentAppId$.pipe(skip(1), take(1)).subscribe(() => {
    onClose();
  });

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(<LazyFlyout closeFlyout={onClose} loadContent={loadContent} core={core} />, core),
    {
      flyoutTitle,
      size: 500,
      type: 'push',
      paddingSize: 'm',
      maxWidth: 800,
      ownFocus: true,
      isResizable: true,
      outsideClickCloses: true,
      className: 'kbnPresentationLazyFlyout',
      onClose,
      ...flyoutProps,
    }
  );
  overlayTracker?.openOverlay(flyoutRef, { focusedPanelId });
  return flyoutRef;
};

function LazyFlyout({
  core,
  loadContent,
  closeFlyout,
}: LoadContentArgs & Pick<OpenLazyFlyoutParams, 'core' | 'loadContent'>) {
  const [LoadedFlyout, setLoadedFlyout] = React.useState<React.JSX.Element | null>(null);
  useAsync(async () => {
    const editFlyoutContent = await loadContent?.({ closeFlyout });
    if (editFlyoutContent) {
      setLoadedFlyout(editFlyoutContent);
    } else {
      // If no content is returned, we close the flyout
      closeFlyout();
      core.notifications.toasts.addWarning(
        i18n.translate('presentationUtils.openLazyFlyout.unableToLoad', {
          defaultMessage: 'Unable to load edit flyout content',
        })
      );
      throw new Error('Unable to load edit flyout content');
    }
  }, []);

  React.useEffect(() => {
    if (!LoadedFlyout) {
      return;
    }
    focusFirstFocusable(document.querySelector('.kbnPresentationLazyFlyout'));
  }, [LoadedFlyout]);

  return LoadedFlyout ?? LoadingFlyout;
}
