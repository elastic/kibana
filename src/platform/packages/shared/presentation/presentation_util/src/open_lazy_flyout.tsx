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
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { htmlIdGenerator } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { skip, take } from 'rxjs';
import { focusFirstFocusable } from './focus_helpers';
import { LoadingFlyout } from './loading_flyout';
import { tracksOverlays } from './tracks_overlays';

const htmlId = htmlIdGenerator('modalTitleId');

interface LoadContentArgs {
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

interface OpenLazyFlyoutParams {
  core: CoreStart;
  parentApi?: unknown;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
  flyoutProps?: Partial<OverlaySystemFlyoutOpenOptions> & {
    triggerId?: string;
    focusedPanelId?: string;
  };
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
 *                             Supports `OverlaySystemFlyoutOpenOptions`.
 * @param params.parentApi - Optional parent API to track opened overlays (e.g. dashboardsApi).
 *
 * @returns A handle to the opened flyout (`OverlayRef`).
 */
export const openLazyFlyout = (params: OpenLazyFlyoutParams) => {
  const { core, parentApi, loadContent, flyoutProps: allFlyoutProps } = params;
  const { focusedPanelId, triggerId, ...flyoutProps } = allFlyoutProps ?? {};

  const ariaLabelledBy = flyoutProps?.['aria-labelledby'] ?? htmlId();
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

  const flyoutRef = core.overlays.openSystemFlyout(
    <LazyFlyout
      closeFlyout={onClose}
      loadContent={loadContent}
      core={core}
      ariaLabelledBy={ariaLabelledBy}
    />,
    {
      session: 'start',
      size: 500,
      type: 'push',
      paddingSize: 'm',
      maxWidth: 800,
      resizable: true,
      ownFocus: true,
      outsideClickCloses: true,
      className: 'kbnPresentationLazyFlyout',
      'aria-labelledby': ariaLabelledBy,
      onClose,
      title: 'title placeholder',
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
  ariaLabelledBy,
}: LoadContentArgs & Pick<OpenLazyFlyoutParams, 'core' | 'loadContent'>) {
  const [LoadedFlyout, setLoadedFlyout] = React.useState<React.JSX.Element | null>(null);
  useAsync(async () => {
    const editFlyoutContent = await loadContent?.({ closeFlyout, ariaLabelledBy });
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
