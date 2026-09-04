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
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import useAsync from 'react-use/lib/useAsync';
import { tracksOverlays } from './tracks_overlays';

interface LoadContentArgs {
  closeModal: () => void;
}

interface OpenLazyModalParams {
  core: CoreStart;
  parentApi?: unknown;
  loadContent: (args: LoadContentArgs) => Promise<React.JSX.Element | null | void>;
}

/**
 * Opens a modal with lazily loaded content.
 *
 * The overlay is tracked immediately (before any async work), so the parent API's
 * `hasOverlays$` is set to `true` synchronously. This prevents duplicate modals from
 * appearing when a save action involves async pre-loading steps.
 *
 * @param params.core - CoreStart, used for mounting.
 * @param params.parentApi - Optional parent API implementing TracksOverlays (e.g. dashboardApi).
 * @param params.loadContent - Async function that returns the modal's JSX content. If it
 *                             resolves to `null` or `void`, the modal closes automatically.
 * @returns An OverlayRef handle for the opened modal.
 */
export const openLazyModal = ({
  core,
  parentApi,
  loadContent,
}: OpenLazyModalParams): OverlayRef => {
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  let isClosed = false;
  let resolveClose: () => void = () => {};
  const onClose = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });

  let unmount: ReturnType<ReturnType<typeof toMountPoint>> | undefined;

  const ref: OverlayRef = {
    onClose,
    close: () => {
      if (!isClosed) {
        isClosed = true;
        unmount?.();
        unmount = undefined;
        resolveClose();
      }
      return onClose;
    },
  };

  const closeModal = () => {
    overlayTracker?.clearOverlays();
    ref.close();
  };

  const mount = toMountPoint(
    <LazyModal loadContent={loadContent} closeModal={closeModal} />,
    core
  );

  unmount = mount(document.createElement('div'));

  // Track the overlay immediately — sets hasOverlays$ = true before any async work in loadContent
  overlayTracker?.openOverlay(ref);

  return ref;
};

function LazyModal({
  loadContent,
  closeModal,
}: {
  loadContent: OpenLazyModalParams['loadContent'];
  closeModal: () => void;
}) {
  const [content, setContent] = React.useState<React.JSX.Element | null>(null);

  useAsync(async () => {
    const result = await loadContent({ closeModal });
    if (result) {
      setContent(result);
    } else {
      closeModal();
    }
  }, []);

  return content;
}
