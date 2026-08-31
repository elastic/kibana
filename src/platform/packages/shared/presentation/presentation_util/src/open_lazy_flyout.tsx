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
import {
  createLazyFlyoutLifecycle,
  LazyFlyoutContent,
  type LoadContentArgs,
} from './lazy_flyout_common';

const htmlId = htmlIdGenerator('modalTitleId');

interface OpenLazyFlyoutParams {
  core: CoreStart;
  parentApi?: unknown;
  returnFocus?: () => void;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
  flyoutProps?: Partial<OverlayFlyoutOpenOptions> & {
    focusedPanelId?: string;
  };
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
export const openLazyFlyout = (params: OpenLazyFlyoutParams) => {
  const { core, parentApi, returnFocus, loadContent, flyoutProps: allFlyoutProps } = params;
  const { focusedPanelId, ...flyoutProps } = allFlyoutProps ?? {};

  const ariaLabelledBy = flyoutProps?.['aria-labelledby'] ?? htmlId();
  const { closeFlyout, overlayTracker, setFlyoutRef } = createLazyFlyoutLifecycle({
    focusedPanelId,
    parentApi,
    returnFocus,
  });
  const panelFlyoutTypeFromParent = overlayTracker?.panelFlyoutType;
  const type = flyoutProps?.type ?? panelFlyoutTypeFromParent ?? 'push';
  const ownFocus = flyoutProps?.ownFocus ?? panelFlyoutTypeFromParent !== 'overlay';

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(
      <LazyFlyoutContent
        closeFlyout={closeFlyout}
        loadContent={loadContent}
        core={core}
        ariaLabelledBy={ariaLabelledBy}
        flyoutClassName="kbnPresentationLazyFlyout"
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
      onClose: closeFlyout,
      ...flyoutProps,
    }
  );
  setFlyoutRef(flyoutRef);
  return flyoutRef;
};
