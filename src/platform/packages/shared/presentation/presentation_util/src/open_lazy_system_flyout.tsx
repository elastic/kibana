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
import {
  createLazyFlyoutLifecycle,
  LazyFlyoutContent,
  type LoadContentArgs,
} from './lazy_flyout_common';

const htmlId = htmlIdGenerator('systemFlyoutTitleId');

interface OpenLazySystemFlyoutParams {
  core: CoreStart;
  parentApi?: unknown;
  returnFocus?: () => void;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
  flyoutProps?: Partial<OverlaySystemFlyoutOpenOptions> & { focusedPanelId?: string };
}

/** Opens a system-managed flyout with lazily loaded content. */
export const openLazySystemFlyout = (params: OpenLazySystemFlyoutParams) => {
  const { core, parentApi, returnFocus, loadContent, flyoutProps: allFlyoutProps } = params;
  const { focusedPanelId, ...flyoutProps } = allFlyoutProps ?? {};
  const ariaLabelledBy = flyoutProps['aria-labelledby'] ?? htmlId();
  const { closeFlyout, setFlyoutRef } = createLazyFlyoutLifecycle({
    focusedPanelId,
    parentApi,
    returnFocus,
  });

  const flyoutRef = core.overlays.openSystemFlyout(
    <LazyFlyoutContent
      closeFlyout={closeFlyout}
      loadContent={loadContent}
      core={core}
      ariaLabelledBy={ariaLabelledBy}
      flyoutClassName="kbnPresentationLazySystemFlyout"
    />,
    {
      size: 500,
      paddingSize: 'm',
      maxWidth: 800,
      ownFocus: true,
      isResizable: true,
      outsideClickCloses: true,
      className: 'kbnPresentationLazySystemFlyout',
      'aria-labelledby': ariaLabelledBy,
      session: 'start',
      onClose: closeFlyout,
      ...flyoutProps,
    }
  );
  setFlyoutRef(flyoutRef);
  return flyoutRef;
};
