/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { i18n } from '@kbn/i18n';
import { focusFirstFocusable, getPanelContextMenuTriggerId } from './focus_helpers';
import { LoadingFlyout } from './loading_flyout';
import { tracksOverlays } from './tracks_overlays';

export interface LoadContentArgs {
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

interface LazyFlyoutContentProps extends LoadContentArgs {
  core: CoreStart;
  flyoutClassName: string;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
}

interface CreateLazyFlyoutLifecycleParams {
  focusedPanelId?: string;
  parentApi?: unknown;
  returnFocus?: () => void;
}

const resolveAttachedElement = (element: HTMLElement | null): HTMLElement | null => {
  if (!element) return null;
  if (element.id) {
    const refreshedElement = document.getElementById(element.id);
    if (refreshedElement) return refreshedElement;
  }
  return document.body.contains(element) ? element : null;
};

export const createLazyFlyoutLifecycle = ({
  focusedPanelId,
  parentApi,
  returnFocus,
}: CreateLazyFlyoutLifecycleParams) => {
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;
  const previouslyFocusedElement =
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
  let flyoutRef: OverlayRef | undefined;

  const closeFlyout = () => {
    overlayTracker?.clearOverlays();
    flyoutRef?.close();
    window.requestAnimationFrame(() => {
      if (returnFocus) {
        setTimeout(returnFocus);
        return;
      }
      const focusTarget =
        resolveAttachedElement(previouslyFocusedElement) ??
        (focusedPanelId
          ? document.getElementById(getPanelContextMenuTriggerId(focusedPanelId))
          : null);
      focusFirstFocusable(focusTarget);
    });
  };

  return {
    closeFlyout,
    overlayTracker,
    setFlyoutRef: (ref: OverlayRef) => {
      flyoutRef = ref;
      overlayTracker?.openOverlay(ref, { focusedPanelId });
    },
  };
};

export const LazyFlyoutContent = ({
  ariaLabelledBy,
  closeFlyout,
  core,
  flyoutClassName,
  loadContent,
}: LazyFlyoutContentProps) => {
  const [loadedContent, setLoadedContent] = useState<React.JSX.Element | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadFlyoutContent = async () => {
      let content: JSX.Element | null | void;
      try {
        content = await loadContent({ closeFlyout, ariaLabelledBy });
      } catch {
        content = null;
      }
      if (!isMounted) return;
      if (content) {
        setLoadedContent(content);
        return;
      }
      closeFlyout();
      core.notifications.toasts.addWarning(
        i18n.translate('presentationUtils.openLazyFlyout.unableToLoad', {
          defaultMessage: 'Unable to load edit flyout content',
        })
      );
    };

    loadFlyoutContent();
    return () => {
      isMounted = false;
    };
  }, [ariaLabelledBy, closeFlyout, core.notifications.toasts, loadContent]);

  useEffect(() => {
    if (loadedContent) {
      focusFirstFocusable(document.querySelector(`.${flyoutClassName}`));
    }
  }, [flyoutClassName, loadedContent]);

  return loadedContent ?? LoadingFlyout;
};
