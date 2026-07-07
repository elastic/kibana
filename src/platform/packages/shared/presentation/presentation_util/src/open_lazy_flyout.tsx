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
  flyoutProps?: Partial<OverlayFlyoutOpenOptions> & { triggerId?: string; focusedPanelId?: string };
}

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
/**
 * Stable DOM id for a panel's context menu ("...") toggle button. Shared with the
 * embeddable panel hover actions (which render the button) so that focus can be
 * returned to the persistent toggle when a flyout opened from the panel closes,
 * even if the action that opened it ran asynchronously and the context menu (and the
 * transient menu item that had focus) was already torn down (WCAG 2.4.3 Focus Order).
 */
export const getPanelContextMenuTriggerId = (panelId: string) =>
  `presentationPanelContextMenu-${panelId}`;

/**
 * Re-queries `el` by its id (so focus survives a re-render that replaced the node),
 * falling back to the node itself while it is still attached to the DOM.
 */
const resolveAttachedElement = (el: HTMLElement | null): HTMLElement | null => {
  if (!el) return null;
  if (el.id) {
    const refreshed = document.getElementById(el.id);
    if (refreshed) return refreshed;
  }
  return document.body.contains(el) ? el : null;
};

export const openLazyFlyout = (params: OpenLazyFlyoutParams) => {
  const { core, parentApi, loadContent, flyoutProps: allFlyoutProps } = params;
  const { focusedPanelId, triggerId, ...flyoutProps } = allFlyoutProps ?? {};

  const ariaLabelledBy = flyoutProps?.['aria-labelledby'] ?? htmlId();
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;
  const panelFlyoutTypeFromParent = overlayTracker?.panelFlyoutType;
  const type = flyoutProps?.type ?? panelFlyoutTypeFromParent ?? 'push';
  const ownFocus = flyoutProps?.ownFocus ?? panelFlyoutTypeFromParent !== 'overlay';

  // Capture the element that had focus when the flyout was opened so focus can be
  // returned to it when the flyout closes. This keeps keyboard and screen reader
  // users on the triggering element (e.g. a panel action button) instead of
  // sending them to the top of the DOM (WCAG 2.4.3 Focus Order). Ignore `<body>`,
  // which means focus was already lost (e.g. a context menu closed before an async
  // action opened the flyout) — the panel fallback below handles that case.
  const previouslyFocusedElement =
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;

  const getTriggerElement = () => {
    // An explicit trigger id always wins.
    const byTriggerId = triggerId ? document.getElementById(triggerId) : null;
    if (byTriggerId) return byTriggerId;
    // Then the element that had focus, re-queried by id so focus survives a re-render
    // that replaced the node (e.g. Lens inline edit) and only used while still attached.
    const byFocusedElement = resolveAttachedElement(previouslyFocusedElement);
    if (byFocusedElement) return byFocusedElement;
    // Finally, for a panel flyout, fall back to the panel's persistent "..." toggle.
    // This covers actions launched from the context menu that open the flyout
    // asynchronously, where the menu (and the menu item that had focus) is gone by
    // the time the flyout opens.
    return focusedPanelId
      ? document.getElementById(getPanelContextMenuTriggerId(focusedPanelId))
      : null;
  };

  const onClose = () => {
    overlayTracker?.clearOverlays();
    flyoutRef?.close();
    // Resolve the trigger element lazily: closing the flyout can re-render the
    // triggering panel, so the element must be looked up after that render (inside
    // focusFirstFocusable's deferred callback) to avoid focusing a stale node.
    focusFirstFocusable(getTriggerElement);
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
