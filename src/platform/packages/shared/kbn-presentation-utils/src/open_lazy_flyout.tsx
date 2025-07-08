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
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiSkeletonTitle,
  htmlIdGenerator,
} from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { OverlayRef } from '@kbn/core-mount-utils-browser';

export interface TracksOverlaysOptions {
  /**
   * If present, the panel with this ID will be focused when the overlay is opened. This can be used in tandem with a push
   * flyout to edit a panel's settings in context
   */
  focusedPanelId?: string;
}

export interface TracksOverlays {
  openOverlay: (ref: OverlayRef, options?: TracksOverlaysOptions) => void;
  clearOverlays: () => void;
}

export const tracksOverlays = (root: unknown): root is TracksOverlays => {
  return Boolean(
    root && typeof root === 'object' && 'openOverlay' in root && 'clearOverlays' in root
  );
};

const getFirstFocusable = (el: HTMLElement | null) => {
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]';
  if (!el) {
    return null;
  }
  if (el.matches(focusableSelector)) {
    return el;
  }
  const firstFocusable = el.querySelector(focusableSelector);
  if (!firstFocusable) {
    return null;
  }
  return firstFocusable as unknown as { focus: () => void };
};

const defaultFlyoutProps: OverlayFlyoutOpenOptions = {
  size: 's',
  type: 'push',
  paddingSize: 'm',
  maxWidth: 800,
  ownFocus: true,
  isResizable: true,
  outsideClickCloses: true,
  className: 'kbnPresentationLazyFlyout',
};

const LoadingPanel = (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiSkeletonTitle size="xs" />
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiSkeletonText />
    </EuiFlyoutBody>
  </>
);

const EditPanelWrapper = ({
  closeFlyout,
  loadContent,
  core,
  ariaLabelledBy,
}: {
  closeFlyout: () => void;
  loadContent: ({
    closeFlyout,
    ariaLabelledBy,
  }: {
    closeFlyout: () => void;
    ariaLabelledBy: string;
  }) => Promise<JSX.Element | null | void>;
  core: CoreStart;
  ariaLabelledBy: string;
}) => {
  const [EditFlyoutPanel, setEditFlyoutPanel] = React.useState<React.JSX.Element | null>(null);
  useAsync(async () => {
    const editFlyoutContent = await loadContent?.({ closeFlyout, ariaLabelledBy });
    if (editFlyoutContent) {
      setEditFlyoutPanel(editFlyoutContent);
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
    if (!EditFlyoutPanel) {
      return;
    } else {
      const flyout = document.querySelector('.kbnPresentationLazyFlyout');
      if (flyout instanceof HTMLElement) {
        const focusable = getFirstFocusable(flyout);
        setTimeout(() => focusable?.focus()); // Focus the trigger element after the flyout closes and any DOM updates are applied, like enabling the UI
      }
    }
  }, [EditFlyoutPanel]);

  return EditFlyoutPanel ?? LoadingPanel;
};

const htmlId = htmlIdGenerator('modalTitleId');

export const openLazyFlyout = ({
  core,
  parentApi,
  loadContent,
  flyoutProps,
  uuid,
}: {
  core: CoreStart;
  parentApi?: unknown;
  loadContent: ({
    closeFlyout,
    ariaLabelledBy,
  }: {
    closeFlyout: () => void;
    ariaLabelledBy: string;
  }) => Promise<JSX.Element | null | void>;
  flyoutProps?: Partial<OverlayFlyoutOpenOptions> & { triggerId?: string };
  uuid?: string;
}) => {
  const ariaLabelledBy = htmlId();
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;
  const { triggerId, ...restFlyoutProps } = flyoutProps || {};

  const onClose = () => {
    overlayTracker?.clearOverlays();
    flyoutRef?.close();
    if (triggerId) {
      const triggerElement = document.getElementById(triggerId);
      if (triggerElement instanceof HTMLElement) {
        const focusable = getFirstFocusable(triggerElement);
        setTimeout(() => focusable?.focus()); // Focus the trigger element after the flyout closes and any DOM updates are applied, like enabling the UI
      }
    }
  };

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(
      <EditPanelWrapper
        closeFlyout={onClose}
        loadContent={loadContent}
        core={core}
        ariaLabelledBy={ariaLabelledBy}
      />,
      core
    ),
    { ...defaultFlyoutProps, 'aria-labelledby': ariaLabelledBy, onClose, ...restFlyoutProps }
  );
  overlayTracker?.openOverlay(flyoutRef, { focusedPanelId: uuid });
  return flyoutRef;
};
