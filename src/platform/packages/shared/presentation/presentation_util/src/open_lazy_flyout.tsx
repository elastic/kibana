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
import { htmlIdGenerator } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { focusFirstFocusable, getPanelContextMenuTriggerId } from './focus_helpers';
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
  returnFocus?: () => void;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
  flyoutProps?: Partial<OverlayFlyoutOpenOptions> & {
    focusedPanelId?: string;
  };
}

// Re-query by id so focus survives a re-render that replaced the node; fall back to the
// node itself while it is still attached.
const resolveAttachedElement = (el: HTMLElement | null): HTMLElement | null => {
  if (!el) return null;
  if (el.id) {
    const refreshed = document.getElementById(el.id);
    if (refreshed) return refreshed;
  }
  return document.body.contains(el) ? el : null;
};

/**
 * Opens a flyout panel with lazily loaded content.
 *
 * This helper handles:
 * - Mounting a flyout panel with async content.
 * - Automatically focusing the flyout when content is ready.
 * - Tracking the flyout if `parentApi` supports overlay tracking.
 * - Returning focus to a trigger element when the flyout closes.
 *
 * @param params - Configuration object.
 * @param params.core - The `CoreStart` contract, used for overlays and notifications.
 * @param params.loadContent - Async function that loads the flyout content. Must return a valid React element.
 *                             If it resolves to `null` or `undefined`, the flyout will close automatically.
 * @param params.flyoutProps - Optional props passed to `openFlyout` (e.g. size, className, etc).
 *                             Supports `OverlayFlyoutOpenOptions`.
 * @param params.parentApi - Optional parent API to track opened overlays (e.g. dashboardsApi).
 *
 * @returns A handle to the opened flyout (`OverlayRef`).
 */
export const openLazyFlyout = (params: OpenLazyFlyoutParams) => {
  const { core, parentApi, returnFocus, loadContent, flyoutProps: allFlyoutProps } = params;
  const { focusedPanelId, ...flyoutProps } = allFlyoutProps ?? {};

  const ariaLabelledBy = flyoutProps?.['aria-labelledby'] ?? htmlId();
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;
  const panelFlyoutTypeFromParent = overlayTracker?.panelFlyoutType;
  const type = flyoutProps?.type ?? panelFlyoutTypeFromParent ?? 'push';
  const ownFocus = flyoutProps?.ownFocus ?? panelFlyoutTypeFromParent !== 'overlay';

  const previouslyFocusedElement =
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;

  const resolveReturnFocusTarget = () => {
    // Priority: the element that had focus (re-queried by id to survive a re-render) →
    // the panel's "..." toggle (for context-menu actions whose menu item is gone by the
    // time an async flyout opens).
    const byFocusedElement = resolveAttachedElement(previouslyFocusedElement);
    if (byFocusedElement) return byFocusedElement;
    return focusedPanelId
      ? document.getElementById(getPanelContextMenuTriggerId(focusedPanelId))
      : null;
  };

  const restoreFocus = () => {
    window.requestAnimationFrame(() => {
      if (returnFocus) {
        setTimeout(returnFocus);
        return;
      }
      focusFirstFocusable(resolveReturnFocusTarget);
    });
  };

  const onClose = () => {
    overlayTracker?.clearOverlays();
    flyoutRef?.close();
    // Resolve lazily: closing can re-render the panel, so the trigger is looked up after
    // that render (inside focusFirstFocusable's deferred callback).
    restoreFocus();
  };

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(
      <LazyFlyout
        closeFlyout={onClose}
        loadContent={loadContent}
        core={core}
        ariaLabelledBy={ariaLabelledBy}
      />,
      core
    ),
    {
      size: 500,
      type,
      paddingSize: 'm',
      maxWidth: 800,
      ownFocus,
      isResizable: true,
      outsideClickCloses: true,
      className: 'kbnPresentationLazyFlyout',
      'aria-labelledby': ariaLabelledBy,
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
