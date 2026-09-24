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
import { EuiDelayRender, EuiSkeletonText, EuiSkeletonTitle, htmlIdGenerator } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import {
  createLazyFlyoutLifecycle,
  LazyFlyoutContent,
  resolvePanelFlyoutDefaults,
  type LoadContentArgs,
} from './lazy_flyout_common';

const htmlId = htmlIdGenerator('flyoutTemplateTitleId');

export interface OpenLazyFlyoutTemplateParams {
  core: CoreStart;
  parentApi?: unknown;
  returnFocus?: () => void;
  loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
  flyoutProps?: Partial<Parameters<CoreStart['overlays']['openFlyoutTemplate']>[0]> & {
    focusedPanelId?: string;
  };
}

const LoadingFlyoutTemplate = ({ closeFlyout }: { closeFlyout: () => void }) => (
  <FlyoutTemplate onClose={closeFlyout}>
    <FlyoutTemplate.Header
      title={
        <EuiDelayRender delay={300}>
          <EuiSkeletonTitle size="xs" />
        </EuiDelayRender>
      }
    />
    <FlyoutTemplate.Body>
      <EuiDelayRender delay={300}>
        <EuiSkeletonText />
      </EuiDelayRender>
    </FlyoutTemplate.Body>
  </FlyoutTemplate>
);

/** Opens a FlyoutTemplate-based flyout with lazily loaded content. */
export const openLazyFlyoutTemplate = (params: OpenLazyFlyoutTemplateParams) => {
  const { core, parentApi, returnFocus, loadContent, flyoutProps: allFlyoutProps } = params;
  const { focusedPanelId, ...flyoutProps } = allFlyoutProps ?? {};
  const ariaLabelledBy = flyoutProps['aria-labelledby'] ?? htmlId();
  const { closeFlyout, overlayTracker, setFlyoutRef } = createLazyFlyoutLifecycle({
    focusedPanelId,
    parentApi,
    returnFocus,
  });
  const { type, ownFocus } = resolvePanelFlyoutDefaults(overlayTracker, flyoutProps);

  const flyoutRef = core.overlays.openFlyoutTemplate(
    {
      size: 500,
      type,
      paddingSize: 'm',
      maxWidth: 800,
      ownFocus,
      resizable: true,
      outsideClickCloses: true,
      className: 'kbnPresentationLazyFlyoutTemplate',
      'aria-labelledby': ariaLabelledBy,
      onClose: closeFlyout,
      ...flyoutProps,
    },
    () => (
      <LazyFlyoutContent
        closeFlyout={closeFlyout}
        loadContent={loadContent}
        core={core}
        ariaLabelledBy={ariaLabelledBy}
        fallback={<LoadingFlyoutTemplate closeFlyout={closeFlyout} />}
        flyoutClassName="kbnPresentationLazyFlyoutTemplate"
      />
    )
  );
  setFlyoutRef(flyoutRef);
  return flyoutRef;
};
