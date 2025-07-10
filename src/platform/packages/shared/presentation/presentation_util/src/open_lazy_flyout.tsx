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
import { skip, take } from 'rxjs';
import { focusFirstFocusable } from './focus_helpers';
import { LoadingFlyout } from './loading_flyout';
import { tracksOverlays } from './tracks_overlays';

const htmlId = htmlIdGenerator('modalTitleId');

export interface LoadContentArgs {
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

export interface OpenLazyFlyoutParams {
  core: CoreStart;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
  flyoutProps?: Partial<OverlayFlyoutOpenOptions> & { triggerId?: string };
  parentApi?: unknown;
  triggerId?: string;
  uuid?: string;
}

export const openLazyFlyout = ({
  core,
  parentApi,
  loadContent,
  flyoutProps,
  uuid,
  triggerId,
}: OpenLazyFlyoutParams) => {
  const ariaLabelledBy = htmlId();
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
      type: 'push',
      paddingSize: 'm',
      maxWidth: 800,
      ownFocus: true,
      isResizable: true,
      outsideClickCloses: true,
      className: 'kbnPresentationLazyFlyout',
      'aria-labelledby': ariaLabelledBy,
      onClose,
      ...flyoutProps,
    }
  );
  overlayTracker?.openOverlay(flyoutRef, { focusedPanelId: uuid });
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
