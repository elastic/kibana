/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { focusFirstFocusable } from './focus_helpers';
import { LoadingFlyout } from './loading_flyout';

const htmlId = htmlIdGenerator('systemFlyoutTitleId');

interface LoadContentArgs {
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

interface OpenLazySystemFlyoutParams {
  core: CoreStart;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
  flyoutProps?: Partial<OverlaySystemFlyoutOpenOptions>;
}

/**
 * Opens a system-managed flyout with lazily loaded content, so the content can open child
 * flyouts. Focus returns to the element that opened it when it closes.
 */
export const openLazySystemFlyout = ({
  core,
  loadContent,
  flyoutProps,
}: OpenLazySystemFlyoutParams) => {
  const ariaLabelledBy = flyoutProps?.['aria-labelledby'] ?? htmlId();
  const previouslyFocusedElement =
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;

  const closeFlyout = () => {
    flyoutRef.close();
    // Resolve lazily: closing can re-render the trigger, so it is looked up by id after that
    // render (inside focusFirstFocusable's deferred callback).
    focusFirstFocusable(() => {
      if (!previouslyFocusedElement) return null;
      if (previouslyFocusedElement.id) {
        const refreshed = document.getElementById(previouslyFocusedElement.id);
        if (refreshed) return refreshed;
      }
      return document.body.contains(previouslyFocusedElement) ? previouslyFocusedElement : null;
    });
  };

  const flyoutRef = core.overlays.openSystemFlyout(
    <LazySystemFlyout
      core={core}
      loadContent={loadContent}
      closeFlyout={closeFlyout}
      ariaLabelledBy={ariaLabelledBy}
    />,
    {
      size: 500,
      paddingSize: 'm',
      maxWidth: 800,
      resizable: true,
      outsideClickCloses: true,
      className: 'kbnPresentationLazySystemFlyout',
      'aria-labelledby': ariaLabelledBy,
      session: 'start',
      onClose: closeFlyout,
      ...flyoutProps,
    }
  );
  return flyoutRef;
};

const LazySystemFlyout = ({
  core,
  loadContent,
  closeFlyout,
  ariaLabelledBy,
}: LoadContentArgs & Pick<OpenLazySystemFlyoutParams, 'core' | 'loadContent'>) => {
  const [loadedContent, setLoadedContent] = useState<JSX.Element | null>(null);

  useEffect(() => {
    let isMounted = true;
    loadContent({ closeFlyout, ariaLabelledBy })
      .catch(() => null)
      .then((content) => {
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
      });
    return () => {
      isMounted = false;
    };
  }, [ariaLabelledBy, closeFlyout, core.notifications.toasts, loadContent]);

  useEffect(() => {
    if (loadedContent) {
      focusFirstFocusable(document.querySelector('.kbnPresentationLazySystemFlyout'));
    }
  }, [loadedContent]);

  return loadedContent ?? LoadingFlyout;
};
